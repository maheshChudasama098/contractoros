import type { Lead } from "@prisma/client";
import type { LeadDto, LeadStage } from "@shared/contracts/leads";

export function toLeadDto(l: Lead): LeadDto {
  return {
    id: l.id,
    first_name: l.firstName,
    last_name: l.lastName,
    company_name: l.companyName,
    email: l.email,
    phone: l.phone,
    stage: l.stage as LeadStage,
    estimated_value: l.estimatedValue?.toFixed(2) ?? null,
    currency: l.currency,
    next_follow_up_at: l.nextFollowUpAt?.toISOString() ?? null,
    created_at: l.createdAt.toISOString(),
  };
}
