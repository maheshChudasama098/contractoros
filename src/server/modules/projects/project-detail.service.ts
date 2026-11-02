import "server-only";
import { Op, type Model } from "sequelize";
import { AuditLog, ChangeOrder, Customer, Invoice, Organization, User } from "@server/core/db/models";
import type { TenantContext } from "@server/core/tenancy/context";
import type {
  ActivityDto,
  ProjectChangeOrderDto,
  ProjectInvoiceDto,
  ProjectOverview,
} from "@shared/contracts/project-detail";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@shared/contracts/projects";
import { eventService } from "./event.service";
import { expenseService } from "./expense.service";
import { projectService } from "./project.service";
import { money2, requireProject, ymd } from "./project-scope";
import { taskService } from "./task.service";

/** Today's date in the company's time zone (schedule dates are wall-clock in that zone). */
async function companyToday(ctx: TenantContext) {
  const org = await Organization.findByPk(ctx.organizationId, { attributes: ["timezone"] });
  const tz = (org?.get("timezone") as string) || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const LIVE_INVOICE = ["issued", "partially_paid", "paid", "overdue"];

type Snap = Record<string, unknown> | null;
const q = (v: unknown) => (v ? `"${String(v)}"` : "");

/** Human sentence for an audit entry on a project. */
function summarize(action: string, before: Snap, after: Snap): string {
  const a = after ?? {};
  const b = before ?? {};
  switch (action) {
    case "project.created":
      return "Created the project";
    case "project.updated":
      return b.status !== a.status && a.status
        ? `Changed status to ${PROJECT_STATUS_LABELS[a.status as ProjectStatus] ?? a.status}`
        : "Updated project details";
    case "task.created":
      return `Added task ${q(a.title)}`;
    case "task.completed":
      return `Completed task ${q(a.title)}`;
    case "task.updated":
      return `Updated task ${q(a.title)}`;
    case "task.deleted":
      return `Deleted task ${q(b.title)}`;
    case "expense.created":
      return `Added expense ${q(a.description)} ($${a.amount})`;
    case "expense.updated":
      return `Updated expense ${q(a.description)}`;
    case "expense.deleted":
      return `Deleted expense ${q(b.description)}`;
    case "expense.receipt_attached":
      return `Attached a receipt to ${q(a.description)}`;
    case "schedule.created":
      return `Scheduled ${q(a.title)} on ${a.start_date}`;
    case "schedule.updated":
      return `Rescheduled ${q(a.title)}`;
    case "schedule.deleted":
      return `Removed ${q(b.title)} from the schedule`;
    case "file.uploaded":
      return `Uploaded ${q(a.filename)}`;
    case "file.deleted":
      return `Deleted file ${q(b.filename)}`;
    case "note.added":
      return "Added a note";
    case "note.deleted":
      return "Deleted a note";
    default:
      return action.replace(/[._]/g, " ");
  }
}

export const projectDetailService = {
  async overview(ctx: TenantContext, projectId: string): Promise<ProjectOverview> {
    await requireProject(ctx, projectId);
    const project = await projectService.get(ctx, projectId);
    const today = await companyToday(ctx);
    const [customer, invoices, expenses, tasks, upcoming, openTasks] = await Promise.all([
      Customer.findOne({ where: { id: project.customer.id, organizationId: ctx.organizationId }, attributes: ["id", "displayName", "email", "phone"] }),
      Invoice.findAll({
        where: { projectId, organizationId: ctx.organizationId, status: LIVE_INVOICE },
        attributes: ["total", "amountPaid", "balanceDue"],
      }),
      expenseService.total(ctx, projectId),
      taskService.counts(ctx, projectId),
      eventService.upcoming(ctx, projectId, today, 5),
      taskService.open(ctx, projectId, 5),
    ]);
    const sum = (k: string) => invoices.reduce((s, i) => s + Number(i.get(k) ?? 0), 0);
    const contract = Number(project.contract_value);
    const invoiced = sum("total");
    return {
      project,
      customer: {
        id: project.customer.id,
        display_name: project.customer.display_name,
        email: (customer?.get("email") as string | null) ?? null,
        phone: (customer?.get("phone") as string | null) ?? null,
      },
      money: {
        contract_value: money2(contract),
        invoiced: money2(invoiced),
        paid: money2(sum("amountPaid")),
        outstanding: money2(sum("balanceDue")),
        remaining_to_bill: money2(Math.max(0, contract - invoiced)),
        expenses,
      },
      tasks,
      upcoming,
      open_tasks: openTasks,
    };
  },

  async activity(ctx: TenantContext, projectId: string): Promise<ActivityDto[]> {
    await requireProject(ctx, projectId);
    const rows = await AuditLog.findAll({
      where: { organizationId: ctx.organizationId, entityType: "project", entityId: projectId },
      include: [{ model: User, as: "actor", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return rows.map((r: Model) => ({
      id: r.get("id") as string,
      action: r.get("action") as string,
      summary: summarize(r.get("action") as string, r.get("beforeSnapshot") as Snap, r.get("afterSnapshot") as Snap),
      actor: ((r.get("actor") as Model | null)?.get("name") as string | undefined) ?? null,
      created_at: (r.get("createdAt") as Date).toISOString(),
    }));
  },

  async invoices(ctx: TenantContext, projectId: string): Promise<ProjectInvoiceDto[]> {
    await requireProject(ctx, projectId);
    const rows = await Invoice.findAll({
      where: { projectId, organizationId: ctx.organizationId },
      order: [["issueDate", "DESC"]],
    });
    return rows.map((i) => ({
      id: i.get("id") as string,
      invoice_number: i.get("invoiceNumber") as string,
      status: i.get("status") as string,
      issue_date: ymd(i.get("issueDate"))!,
      due_date: ymd(i.get("dueDate")),
      total: money2(i.get("total")),
      amount_paid: money2(i.get("amountPaid")),
      balance_due: money2(i.get("balanceDue")),
    }));
  },

  async changeOrders(ctx: TenantContext, projectId: string): Promise<ProjectChangeOrderDto[]> {
    await requireProject(ctx, projectId);
    const rows = await ChangeOrder.findAll({
      where: { projectId, organizationId: ctx.organizationId, status: { [Op.ne]: "voided" } },
      order: [["createdAt", "DESC"]],
    });
    return rows.map((c) => ({
      id: c.get("id") as string,
      change_order_number: c.get("changeOrderNumber") as string,
      title: c.get("title") as string,
      status: c.get("status") as string,
      price_delta: money2(c.get("priceDelta")),
      created_at: (c.get("createdAt") as Date).toISOString(),
    }));
  },
};
