// GET /api/v1/dashboard/summary. Sections the user has no permission for are null.

export type DashboardSummary = {
  greeting_name: string;
  today: string;
  projects: {
    active: number;
    by_status: { status: string; count: number }[];
    list: { id: string; project_number: string; name: string; customer: string; status: string; tasks_total: number; tasks_done: number; planned_end_date: string | null }[];
  } | null;
  work: {
    overdue_tasks: number;
    due_soon: { id: string; title: string; due_date: string; project: { id: string; project_number: string; name: string } }[];
    schedule: { id: string; title: string; start_date: string; start_time: string | null; all_day: boolean; project: { id: string; project_number: string; name: string } }[];
  } | null;
  money: {
    outstanding: string;
    overdue: string;
    collected_this_month: string;
    /** Last 6 months, oldest first. */
    collected_by_month: { month: string; amount: string }[];
    aging: { bucket: "current" | "1-30" | "31-60" | "61-90" | "90+"; amount: string; count: number }[];
  } | null;
  sales: {
    open_estimates: number;
    open_estimates_value: string;
    proposals_waiting: number;
    contracts_to_sign: number;
    won_90d_value: string;
    win_rate_90d: number | null;
  } | null;
  attention: { kind: "invoice_overdue" | "task_overdue" | "proposal_expiring" | "contract_unsigned" | "contract_to_send"; title: string; detail: string; href: string }[];
};
