import { api } from "@web/lib/api-client";
import type { EstimateDetail, EstimateInput, EstimateListPage, EstimateListQuery, EstimateStatus } from "@shared/contracts/estimates";
import type {
  ContractDetail,
  ContractInput,
  ContractListItem,
  ContractListQuery,
  ContractStatus,
  ContractTab,
  CreateProjectFromContractInput,
  ProposalLink,
  ProposalListItem,
  ProposalListQuery,
  ProposalStatus,
  ProposalTab,
  SendProposalInput,
  SignatureLink,
} from "@shared/contracts/proposals";
import type { Tone } from "@web/theme/tokens";

const json = (method: string, body?: unknown) => ({ method, body: JSON.stringify(body ?? {}) });
const qs = (q: object) =>
  new URLSearchParams(Object.entries(q).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]]))).toString();

type Page<T, K extends string> = { items: T[]; page: number; per_page: number; total: number; counts: Record<K, number> };

export const estimatesApi = {
  list: (q: EstimateListQuery) => api<EstimateListPage>(`/estimates?${qs(q)}`),
  get: (id: string, versionId?: string) => api<EstimateDetail>(`/estimates/${id}${versionId ? `?version=${versionId}` : ""}`),
  create: (input: EstimateInput) => api<EstimateDetail>("/estimates", json("POST", input)),
  update: (id: string, input: EstimateInput) => api<EstimateDetail>(`/estimates/${id}`, json("PUT", input)),
  remove: (id: string) => api<{ deleted: true }>(`/estimates/${id}`, { method: "DELETE" }),
  issue: (id: string) => api<EstimateDetail>(`/estimates/${id}/issue`, json("POST")),
  revise: (id: string) => api<EstimateDetail>(`/estimates/${id}/versions`, json("POST")),
  discardDraft: (id: string) => api<EstimateDetail>(`/estimates/${id}/versions`, { method: "DELETE" }),
  sendProposal: (id: string, input: SendProposalInput) => api<ProposalLink>(`/estimates/${id}/proposals`, json("POST", input)),
};

export const proposalsApi = {
  list: (q: ProposalListQuery) => api<Page<ProposalListItem, ProposalTab>>(`/proposals?${qs(q)}`),
  renewLink: (id: string) => api<ProposalLink>(`/proposals/${id}/send`, json("POST")),
  withdraw: (id: string) => api<ProposalListItem>(`/proposals/${id}/withdraw`, json("POST")),
};

export const contractsApi = {
  list: (q: ContractListQuery) => api<Page<ContractListItem, ContractTab>>(`/contracts?${qs(q)}`),
  get: (id: string) => api<ContractDetail>(`/contracts/${id}`),
  update: (id: string, input: ContractInput) => api<ContractDetail>(`/contracts/${id}`, json("PUT", input)),
  send: (id: string, expiresInDays = 14) => api<SignatureLink>(`/contracts/${id}/signature-request`, json("POST", { expires_in_days: expiresInDays })),
  void: (id: string, reason: string) => api<ContractDetail>(`/contracts/${id}/void`, json("POST", { reason })),
  createProject: (id: string, input: CreateProjectFromContractInput) => api<{ project_id: string }>(`/contracts/${id}/project`, json("POST", input)),
};

export const ESTIMATE_TONE: Record<EstimateStatus, Tone> = {
  draft: "neutral",
  issued: "info",
  accepted: "success",
  declined: "danger",
  expired: "warning",
  superseded: "neutral",
};
export const PROPOSAL_TONE: Record<ProposalStatus, Tone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  declined: "danger",
  expired: "warning",
  withdrawn: "neutral",
};
export const CONTRACT_TONE: Record<ContractStatus, Tone> = { draft: "neutral", pending_signature: "warning", signed: "success", voided: "neutral" };

export const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
export const fmtDay = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
