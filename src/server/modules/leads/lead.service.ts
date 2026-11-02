import "server-only";
import { prisma } from "@server/core/db/prisma";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { CreateLeadInput, LeadDto, ListLeadsQuery } from "@shared/contracts/leads";
import type { Paginated } from "@shared/contracts/api";
import { leadRepository } from "./lead.repository";
import { toLeadDto } from "./lead.mapper";

// Business rules live here. Route handlers and React components stay thin.
export const leadService = {
  async list(ctx: TenantContext, q: ListLeadsQuery): Promise<Paginated<LeadDto>> {
    authorize(ctx, "lead.read");
    const [rows, total] = await leadRepository.list(ctx.organizationId, {
      stage: q.stage,
      skip: (q.page - 1) * q.per_page,
      take: q.per_page,
    });
    return { items: rows.map(toLeadDto), page: q.page, per_page: q.per_page, total };
  },

  async get(ctx: TenantContext, id: string): Promise<LeadDto> {
    authorize(ctx, "lead.read");
    const lead = await leadRepository.findById(ctx.organizationId, id);
    if (!lead) throw Errors.notFound("Lead");
    return toLeadDto(lead);
  },

  async create(ctx: TenantContext, input: CreateLeadInput): Promise<LeadDto> {
    authorize(ctx, "lead.write");
    const lead = await prisma.$transaction(async (tx) => {
      const created = await leadRepository.create(
        {
          organizationId: ctx.organizationId,
          firstName: input.first_name,
          lastName: input.last_name,
          companyName: input.company_name,
          email: input.email,
          phone: input.phone,
          estimatedValue: input.estimated_value,
          nextFollowUpAt: input.next_follow_up_at ? new Date(input.next_follow_up_at) : undefined,
          notes: input.notes,
          stage: "new",
          currency: "USD",
          createdByUserId: ctx.userId,
        },
        tx,
      );
      await recordAudit(ctx, { action: "lead.created", entityType: "lead", entityId: created.id }, tx);
      return created;
    });
    return toLeadDto(lead);
  },
};
