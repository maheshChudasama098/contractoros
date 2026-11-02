import "server-only";
import path from "node:path";
import type { Model } from "sequelize";
import { MasterItem, ProjectExpense, StoredFile, sequelize } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import { readStoredFile, saveFile, sniffImageType } from "@server/core/storage/local-storage";
import type { TenantContext } from "@server/core/tenancy/context";
import { RECEIPT_MAX_BYTES, type ExpenseData, type ExpenseDto } from "@shared/contracts/project-detail";
import { masterService } from "@server/modules/masters";
import { money2, projectAudit, requireProject, UUID, ymd } from "./project-scope";

const include = [{ model: StoredFile, as: "receiptFile", attributes: ["id", "originalFilename"] }];

/** code -> name for the two expense masters, so rows show labels even for inactive items. */
async function masterNames() {
  const rows = await MasterItem.findAll({ where: { type: ["expense_category", "payment_method"] }, attributes: ["type", "code", "name"] });
  return new Map(rows.map((r) => [`${r.get("type")}:${r.get("code")}`, r.get("name") as string]));
}

function toDto(e: Model, names: Map<string, string>): ExpenseDto {
  const label = (type: string, code: unknown) =>
    code ? { code: code as string, name: names.get(`${type}:${code}`) ?? (code as string) } : null;
  const f = e.get("receiptFile") as Model | null;
  return {
    id: e.get("id") as string,
    expense_date: ymd(e.get("expenseDate"))!,
    description: e.get("description") as string,
    category: label("expense_category", e.get("category")),
    vendor: (e.get("vendor") as string | null) ?? null,
    amount: money2(e.get("amount")),
    payment_method: label("payment_method", e.get("paymentMethod")),
    receipt: f ? { id: f.get("id") as string, filename: f.get("originalFilename") as string } : null,
    created_at: (e.get("createdAt") as Date).toISOString(),
  };
}

async function assertMasters(input: ExpenseData, before?: ExpenseDto) {
  const errors: Record<string, string[]> = {};
  // Unchanged values may be inactive now; only new choices must be active.
  if (input.category && input.category !== before?.category?.code && !(await masterService.isActiveValue("expense_category", input.category)))
    errors.category = ["Choose a category."];
  if (input.payment_method && input.payment_method !== before?.payment_method?.code && !(await masterService.isActiveValue("payment_method", input.payment_method)))
    errors.payment_method = ["Choose a payment method."];
  if (Object.keys(errors).length) throw Errors.validation(errors);
}

const row = (d: ExpenseData) => ({
  expenseDate: d.expense_date,
  description: d.description,
  category: d.category,
  vendor: d.vendor,
  amount: d.amount,
  paymentMethod: d.payment_method,
});

async function findExpense(ctx: TenantContext, projectId: string, id: string) {
  const e = UUID.test(id)
    ? await ProjectExpense.findOne({ where: { id, projectId, organizationId: ctx.organizationId }, include })
    : null;
  if (!e) throw Errors.notFound("Expense");
  return e;
}

export const expenseService = {
  async list(ctx: TenantContext, projectId: string): Promise<ExpenseDto[]> {
    await requireProject(ctx, projectId);
    const [rows, names] = await Promise.all([
      ProjectExpense.findAll({
        where: { projectId, organizationId: ctx.organizationId },
        include,
        order: [["expenseDate", "DESC"], ["createdAt", "DESC"]],
      }),
      masterNames(),
    ]);
    return rows.map((r) => toDto(r, names));
  },

  async total(ctx: TenantContext, projectId: string) {
    const sum = await ProjectExpense.sum("amount", { where: { projectId, organizationId: ctx.organizationId } });
    return money2(sum);
  },

  async create(ctx: TenantContext, projectId: string, input: ExpenseData): Promise<ExpenseDto> {
    await requireProject(ctx, projectId, "project.write");
    await assertMasters(input);
    const e = await ProjectExpense.create({ organizationId: ctx.organizationId, projectId, createdByUserId: ctx.userId, ...row(input) });
    const dto = toDto(await findExpense(ctx, projectId, e.get("id") as string), await masterNames());
    await projectAudit(ctx, projectId, "expense.created", { after: dto });
    return dto;
  },

  async update(ctx: TenantContext, projectId: string, id: string, input: ExpenseData): Promise<ExpenseDto> {
    await requireProject(ctx, projectId, "project.write");
    const names = await masterNames();
    const e = await findExpense(ctx, projectId, id);
    const before = toDto(e, names);
    await assertMasters(input, before);
    await e.update(row(input));
    const after = toDto(await findExpense(ctx, projectId, id), names);
    await projectAudit(ctx, projectId, "expense.updated", { before, after });
    return after;
  },

  async remove(ctx: TenantContext, projectId: string, id: string): Promise<void> {
    await requireProject(ctx, projectId, "project.write");
    const e = await findExpense(ctx, projectId, id);
    const before = toDto(e, await masterNames());
    await e.destroy();
    await projectAudit(ctx, projectId, "expense.deleted", { before });
  },

  /** Attaches (or replaces) the receipt: an image or PDF, checked by its bytes. */
  async attachReceipt(ctx: TenantContext, projectId: string, id: string, file: File): Promise<ExpenseDto> {
    await requireProject(ctx, projectId, "project.write");
    const e = await findExpense(ctx, projectId, id);
    if (file.size > RECEIPT_MAX_BYTES) throw Errors.validation({ receipt: ["Receipt must be 10 MB or smaller."] });
    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageType(buf);
    if (!mimeType) throw Errors.validation({ receipt: ["Upload a photo (PNG, JPG, WebP) or a PDF."] });
    const ext = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1]!.replace("jpeg", "jpg");
    const { key, checksum } = await saveFile(ctx.organizationId, "receipts", buf, ext);
    await sequelize.transaction(async (transaction) => {
      const stored = await StoredFile.create(
        {
          organizationId: ctx.organizationId,
          storageProvider: "local",
          bucketKey: key,
          originalFilename: path.basename(file.name).slice(0, 255) || `receipt.${ext}`,
          mimeType,
          sizeBytes: buf.length,
          checksumSha256: checksum,
          uploadedByUserId: ctx.userId,
          scanStatus: "not_required",
          status: "available",
        },
        { transaction },
      );
      await e.update({ receiptFileId: stored.get("id") }, { transaction });
    });
    const dto = toDto(await findExpense(ctx, projectId, id), await masterNames());
    await projectAudit(ctx, projectId, "expense.receipt_attached", { after: dto });
    return dto;
  },

  async receipt(ctx: TenantContext, projectId: string, id: string) {
    await requireProject(ctx, projectId);
    const e = await findExpense(ctx, projectId, id);
    const f = e.get("receiptFileId")
      ? await StoredFile.findOne({ where: { id: e.get("receiptFileId"), organizationId: ctx.organizationId } })
      : null;
    if (!f) throw Errors.notFound("Receipt");
    return {
      body: await readStoredFile(f.get("bucketKey") as string),
      mimeType: f.get("mimeType") as string,
      filename: f.get("originalFilename") as string,
    };
  },
};
