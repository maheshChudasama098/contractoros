import { api, ApiClientError } from "@web/lib/api-client";
import type { ApiError } from "@shared/contracts/api";
import type { MasterOption } from "@shared/contracts/masters";
import type {
  ActivityDto,
  AssigneeOption,
  ExpenseDto,
  ExpenseInput,
  NoteDto,
  ProjectChangeOrderDto,
  ProjectEventDto,
  ProjectEventInput,
  ProjectFileDto,
  ProjectInvoiceDto,
  ProjectOverview,
  TaskDto,
  TaskInput,
} from "@shared/contracts/project-detail";

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

async function del(path: string) {
  const res = await fetch(`/api/v1${path}`, { method: "DELETE", credentials: "same-origin" });
  if (!res.ok) throw new ApiClientError(res.status, ((await res.json()) as ApiError).error);
}

// Multipart upload: the browser sets the boundary, so skip api()'s JSON content-type.
async function upload<T>(path: string, field: string, file: File): Promise<T> {
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(`/api/v1${path}`, { method: "POST", body, credentials: "same-origin" });
  const out = await res.json();
  if (!res.ok) throw new ApiClientError(res.status, (out as ApiError).error);
  return (out as { data: T }).data;
}

/** All calls for one project's detail page. */
export const projectDetailApi = (projectId: string) => {
  const base = `/projects/${projectId}`;
  return {
    overview: () => api<ProjectOverview>(`${base}/overview`),
    activity: () => api<ActivityDto[]>(`${base}/activity`),
    invoices: () => api<ProjectInvoiceDto[]>(`${base}/invoices`),
    changeOrders: () => api<ProjectChangeOrderDto[]>(`${base}/change-orders`),

    tasks: () => api<TaskDto[]>(`${base}/tasks`),
    assignees: () => api<AssigneeOption[]>(`${base}/assignees`),
    createTask: (input: TaskInput) => api<TaskDto>(`${base}/tasks`, json("POST", input)),
    updateTask: (id: string, input: TaskInput) => api<TaskDto>(`${base}/tasks/${id}`, json("PUT", input)),
    deleteTask: (id: string) => del(`${base}/tasks/${id}`),

    expenses: () => api<ExpenseDto[]>(`${base}/expenses`),
    createExpense: (input: ExpenseInput) => api<ExpenseDto>(`${base}/expenses`, json("POST", input)),
    updateExpense: (id: string, input: ExpenseInput) => api<ExpenseDto>(`${base}/expenses/${id}`, json("PUT", input)),
    deleteExpense: (id: string) => del(`${base}/expenses/${id}`),
    uploadReceipt: (id: string, file: File) => upload<ExpenseDto>(`${base}/expenses/${id}/receipt`, "receipt", file),
    receiptUrl: (id: string) => `/api/v1${base}/expenses/${id}/receipt`,

    events: (from: string, to: string) => api<ProjectEventDto[]>(`${base}/events?from=${from}&to=${to}`),
    createEvent: (input: ProjectEventInput) => api<ProjectEventDto>(`${base}/events`, json("POST", input)),
    updateEvent: (id: string, input: ProjectEventInput) => api<ProjectEventDto>(`${base}/events/${id}`, json("PUT", input)),
    deleteEvent: (id: string) => del(`${base}/events/${id}`),

    files: () => api<ProjectFileDto[]>(`${base}/files`),
    uploadFile: (file: File) => upload<ProjectFileDto>(`${base}/files`, "file", file),
    fileUrl: (id: string, download = false) => `/api/v1${base}/files/${id}${download ? "?download=1" : ""}`,
    deleteFile: (id: string) => del(`${base}/files/${id}`),

    notes: () => api<NoteDto[]>(`${base}/notes`),
    addNote: (body: string) => api<NoteDto>(`${base}/notes`, json("POST", { body })),
    deleteNote: (id: string) => del(`${base}/notes/${id}`),

    options: (type: "expense_category" | "payment_method") => masterOptions(type),
  };
};
export type ProjectDetailApi = ReturnType<typeof projectDetailApi>;

const viewOnly = () => Promise.reject(new ApiClientError(403, { code: "forbidden", message: "This link is view-only." } as ApiError["error"]));

/**
 * Same calls as `projectDetailApi`, through a share-link token: everything reads, only
 * tasks write (with the visitor's name for the activity log). `byName` is asked once.
 */
export const sharedProjectApi = (token: string, byName: () => string): ProjectDetailApi => {
  const base = `/portal/projects/${token}`;
  const withName = (input: TaskInput) => ({ ...input, by_name: byName() });
  return {
    overview: () => api<ProjectOverview>(`${base}/overview`),
    activity: () => api<ActivityDto[]>(`${base}/activity`),
    invoices: () => api<ProjectInvoiceDto[]>(`${base}/invoices`),
    changeOrders: () => api<ProjectChangeOrderDto[]>(`${base}/change-orders`),
    tasks: () => api<TaskDto[]>(`${base}/tasks`),
    assignees: () => api<AssigneeOption[]>(`${base}/assignees`),
    createTask: (input: TaskInput) => api<TaskDto>(`${base}/tasks`, json("POST", withName(input))),
    updateTask: (id: string, input: TaskInput) => api<TaskDto>(`${base}/tasks/${id}`, json("PUT", withName(input))),
    deleteTask: viewOnly,
    expenses: () => api<ExpenseDto[]>(`${base}/expenses`),
    createExpense: viewOnly,
    updateExpense: viewOnly,
    deleteExpense: viewOnly,
    uploadReceipt: viewOnly,
    receiptUrl: (id: string) => `/api/v1${base}/expenses/${id}/receipt`,
    events: (from: string, to: string) => api<ProjectEventDto[]>(`${base}/events?from=${from}&to=${to}`),
    createEvent: viewOnly,
    updateEvent: viewOnly,
    deleteEvent: viewOnly,
    files: () => api<ProjectFileDto[]>(`${base}/files`),
    uploadFile: viewOnly,
    fileUrl: (id: string, download = false) => `/api/v1${base}/files/${id}${download ? "?download=1" : ""}`,
    deleteFile: viewOnly,
    notes: () => api<NoteDto[]>(`${base}/notes`),
    addNote: viewOnly,
    deleteNote: viewOnly,
    options: (type: "expense_category" | "payment_method") => api<MasterOption[]>(`${base}/masters/${type}`),
  };
};

export const masterOptions = (type: "expense_category" | "payment_method") => api<MasterOption[]>(`/masters/${type}`);

// ---------------------------------------------------------------- formatting

export const usd = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** "2026-11-05" -> "Nov 5, 2026" without time-zone shifts. */
export const fmtDay = (ymd: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", opts) : "";

export const fmtTime = (hhmm: string | null) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
