import { api } from "@web/lib/api-client";
import type { Paginated } from "@shared/contracts/api";
import type { CreateLeadInput, LeadDto } from "@shared/contracts/leads";

export const leadsApi = {
  list: (page = 1) => api<Paginated<LeadDto>>(`/leads?page=${page}`),
  create: (input: CreateLeadInput) => api<LeadDto>("/leads", { method: "POST", body: JSON.stringify(input) }),
};
