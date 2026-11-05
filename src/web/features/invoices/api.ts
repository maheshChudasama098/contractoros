import { api } from "@web/lib/api-client";
import type {
  InvoiceDetail,
  InvoiceInput,
  InvoiceListPage,
  InvoiceListQuery,
  InvoiceStatus,
  RecordPaymentInput,
} from "@shared/contracts/invoices";
import type { Tone } from "@web/theme/tokens";

const json = (method: string, body?: unknown) => ({ method, ...(body !== undefined && { body: JSON.stringify(body) }) });

export const invoicesApi = {
  list: (q: InvoiceListQuery) => {
    const params = new URLSearchParams(
      Object.entries(q).flatMap(([k, val]) => (val === undefined || val === "" ? [] : [[k, String(val)]])),
    );
    return api<InvoiceListPage>(`/invoices?${params}`);
  },
  get: (id: string) => api<InvoiceDetail>(`/invoices/${id}`),
  create: (input: InvoiceInput) => api<InvoiceDetail>("/invoices", json("POST", input)),
  update: (id: string, input: InvoiceInput) => api<InvoiceDetail>(`/invoices/${id}`, json("PUT", input)),
  remove: (id: string) => api<{ deleted: true }>(`/invoices/${id}`, json("DELETE")),
  issue: (id: string) => api<InvoiceDetail>(`/invoices/${id}/issue`, json("POST", {})),
  void: (id: string, reason: string) => api<InvoiceDetail>(`/invoices/${id}/void`, json("POST", { reason })),
  recordPayment: (id: string, input: RecordPaymentInput) => api<InvoiceDetail>(`/invoices/${id}/payments`, json("POST", input)),
  voidPayment: (id: string, paymentId: string, reason: string) =>
    api<InvoiceDetail>(`/invoices/${id}/payments/${paymentId}/void`, json("POST", { reason })),
};

export const INVOICE_TONE: Record<InvoiceStatus, Tone> = {
  draft: "neutral",
  issued: "info",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  void: "neutral",
};

export const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/** "1234.5" → "$1,234.50" */
export const usd = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
