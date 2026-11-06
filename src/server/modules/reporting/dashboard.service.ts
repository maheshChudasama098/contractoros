import "server-only";
import { QueryTypes } from "sequelize";
import { User, sequelize } from "@server/core/db/models";
import { can } from "@server/core/authorization/policy";
import type { TenantContext } from "@server/core/tenancy/context";
import type { DashboardSummary } from "@shared/contracts/dashboard";
import { fromCents, toCents } from "@shared/lib/invoice-math";

type Row = Record<string, unknown>;
const q = <T extends Row = Row>(sql: string, org: string, extra: Row = {}) =>
  sequelize.query<T>(sql, { replacements: { org, ...extra }, type: QueryTypes.SELECT });
const money = (v: unknown) => fromCents(toCents(String(v ?? "0")));
const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const OPEN_PROJECT = ["planned", "scheduled", "active", "on_hold"];

/** Dashboard numbers in a handful of aggregate queries, each section gated by permission. */
export const dashboardService = {
  async summary(ctx: TenantContext): Promise<DashboardSummary> {
    const org = ctx.organizationId;
    const today = new Date().toISOString().slice(0, 10);
    const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const user = await User.findByPk(ctx.userId, { attributes: ["name"] });
    const attention: DashboardSummary["attention"] = [];

    // ---------------------------------------------------------------- projects + work
    let projects: DashboardSummary["projects"] = null;
    let work: DashboardSummary["work"] = null;
    if (can(ctx, "project.read")) {
      const [byStatus, list, overdue, dueSoon, schedule] = await Promise.all([
        q<{ status: string; n: string }>(`SELECT status, COUNT(*) n FROM projects WHERE organization_id = :org GROUP BY status`, org),
        q(
          `SELECT p.id, p.project_number, p.name, p.status, p.planned_end_date, c.display_name customer,
                  COUNT(t.id) FILTER (WHERE t.status <> 'cancelled') tasks_total,
                  COUNT(t.id) FILTER (WHERE t.status = 'done') tasks_done
             FROM projects p JOIN customers c ON c.id = p.customer_id
             LEFT JOIN project_tasks t ON t.project_id = p.id
            WHERE p.organization_id = :org AND p.status IN (:open)
            GROUP BY p.id, c.display_name
            ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'on_hold' THEN 2 ELSE 3 END, p.planned_end_date NULLS LAST
            LIMIT 6`,
          org,
          { open: OPEN_PROJECT },
        ),
        q<{ id: string; title: string; due: Date; pid: string; num: string; pname: string }>(
          `SELECT t.id, t.title, t.due_at due, p.id pid, p.project_number num, p.name pname
             FROM project_tasks t JOIN projects p ON p.id = t.project_id
            WHERE t.organization_id = :org AND t.status IN ('todo','in_progress','blocked') AND t.due_at < :today::date
            ORDER BY t.due_at LIMIT 50`,
          org,
          { today },
        ),
        q<{ id: string; title: string; due: Date; pid: string; num: string; pname: string }>(
          `SELECT t.id, t.title, t.due_at due, p.id pid, p.project_number num, p.name pname
             FROM project_tasks t JOIN projects p ON p.id = t.project_id
            WHERE t.organization_id = :org AND t.status IN ('todo','in_progress','blocked')
              AND t.due_at >= :today::date AND t.due_at < (:in14::date + 1)
            ORDER BY t.due_at LIMIT 8`,
          org,
          { today, in14 },
        ),
        q<{ id: string; title: string; start_at: Date; all_day: boolean; pid: string; num: string; pname: string }>(
          `SELECT e.id, e.title, e.start_at, e.all_day, p.id pid, p.project_number num, p.name pname
             FROM project_events e JOIN projects p ON p.id = e.project_id
            WHERE e.organization_id = :org AND e.end_at >= :today::date AND e.start_at < (:in14::date + 1)
            ORDER BY e.start_at LIMIT 8`,
          org,
          { today, in14 },
        ),
      ]);
      const counts = byStatus.map((r) => ({ status: r.status, count: Number(r.n) }));
      projects = {
        active: counts.filter((c) => OPEN_PROJECT.includes(c.status)).reduce((s, c) => s + c.count, 0),
        by_status: counts,
        list: list.map((r) => ({
          id: r.id as string,
          project_number: r.project_number as string,
          name: r.name as string,
          customer: r.customer as string,
          status: r.status as string,
          tasks_total: Number(r.tasks_total),
          tasks_done: Number(r.tasks_done),
          planned_end_date: ymd(r.planned_end_date),
        })),
      };
      const proj = (r: { pid: string; num: string; pname: string }) => ({ id: r.pid, project_number: r.num, name: r.pname });
      work = {
        overdue_tasks: overdue.length,
        due_soon: dueSoon.map((r) => ({ id: r.id, title: r.title, due_date: ymd(r.due)!, project: proj(r) })),
        // Event times are stored as floating wall-clock UTC, so the UTC parts are the local time.
        schedule: schedule.map((r) => ({
          id: r.id,
          title: r.title,
          start_date: r.start_at.toISOString().slice(0, 10),
          start_time: r.all_day ? null : r.start_at.toISOString().slice(11, 16),
          all_day: r.all_day,
          project: proj(r),
        })),
      };
      for (const t of overdue.slice(0, 3))
        attention.push({ kind: "task_overdue", title: t.title, detail: `Task overdue since ${ymd(t.due)} · ${t.num}`, href: `/projects/${t.pid}?tab=tasks` });
    }

    // ---------------------------------------------------------------- money
    let moneyOut: DashboardSummary["money"] = null;
    if (can(ctx, "invoice.read")) {
      const [aging, monthly, overdueList] = await Promise.all([
        q<{ bucket: string; amount: string; n: string }>(
          `SELECT CASE
                    WHEN due_date IS NULL OR due_date >= :today::date THEN 'current'
                    WHEN :today::date - due_date <= 30 THEN '1-30'
                    WHEN :today::date - due_date <= 60 THEN '31-60'
                    WHEN :today::date - due_date <= 90 THEN '61-90'
                    ELSE '90+' END bucket,
                  SUM(balance_due) amount, COUNT(*) n
             FROM invoices WHERE organization_id = :org AND status IN ('issued','partially_paid')
            GROUP BY 1`,
          org,
          { today },
        ),
        q<{ m: string; amount: string }>(
          `SELECT to_char(date_trunc('month', COALESCE(paid_on, succeeded_at::date)), 'YYYY-MM') m, SUM(amount) amount
             FROM payments
            WHERE organization_id = :org AND status = 'succeeded'
              AND COALESCE(paid_on, succeeded_at::date) >= date_trunc('month', :today::date) - INTERVAL '5 months'
            GROUP BY 1`,
          org,
          { today },
        ),
        q<{ id: string; num: string; bal: string; due: string; cust: string }>(
          `SELECT i.id, i.invoice_number num, i.balance_due bal, i.due_date due, c.display_name cust
             FROM invoices i JOIN customers c ON c.id = i.customer_id
            WHERE i.organization_id = :org AND i.status IN ('issued','partially_paid') AND i.due_date < :today::date
            ORDER BY i.due_date LIMIT 3`,
          org,
          { today },
        ),
      ]);
      const buckets = ["current", "1-30", "31-60", "61-90", "90+"] as const;
      const byBucket = new Map(aging.map((a) => [a.bucket, a]));
      const months: { month: string; amount: string }[] = [];
      const base = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
        const key = d.toISOString().slice(0, 7);
        months.push({ month: key, amount: money(monthly.find((m) => m.m === key)?.amount) });
      }
      const sumCents = (bs: readonly string[]) => bs.reduce((s, b) => s + toCents(money(byBucket.get(b)?.amount)), 0);
      moneyOut = {
        outstanding: fromCents(sumCents(buckets)),
        overdue: fromCents(sumCents(buckets.slice(1))),
        collected_this_month: months[5]!.amount,
        collected_by_month: months,
        aging: buckets.map((b) => ({ bucket: b, amount: money(byBucket.get(b)?.amount), count: Number(byBucket.get(b)?.n ?? 0) })),
      };
      for (const i of overdueList)
        attention.unshift({ kind: "invoice_overdue", title: `${i.num} · ${i.cust}`, detail: `$${money(i.bal)} overdue since ${ymd(i.due)}`, href: `/invoices/${i.id}` });
    }

    // ---------------------------------------------------------------- sales
    let sales: DashboardSummary["sales"] = null;
    if (can(ctx, "estimate.read")) {
      const [[est], [won], expiring, unsigned, toSend] = await Promise.all([
        q<{ n: string; v: string }>(
          `SELECT COUNT(*) n, COALESCE(SUM(v.total),0) v FROM estimates e JOIN estimate_versions v ON v.id = e.current_version_id
            WHERE e.organization_id = :org AND e.status IN ('draft','issued')`,
          org,
        ),
        q<{ won: string; lost: string; v: string }>(
          `SELECT COUNT(*) FILTER (WHERE e.status='accepted') won, COUNT(*) FILTER (WHERE e.status='declined') lost,
                  COALESCE(SUM(v.total) FILTER (WHERE e.status='accepted'),0) v
             FROM estimates e JOIN estimate_versions v ON v.id = e.current_version_id
            WHERE e.organization_id = :org AND e.status IN ('accepted','declined') AND e.updated_at >= NOW() - INTERVAL '90 days'`,
          org,
        ),
        q<{ id: string; eid: string; num: string; exp: Date; cust: string }>(
          `SELECT p.id, p.estimate_id eid, p.proposal_number num, p.expires_at exp, c.display_name cust
             FROM proposals p JOIN customers c ON c.id = p.customer_id
            WHERE p.organization_id = :org AND p.status = 'sent' AND p.expires_at >= NOW()
            ORDER BY p.expires_at`,
          org,
        ),
        q<{ id: string; num: string; sent: Date; cust: string }>(
          `SELECT k.id, k.contract_number num, k.sent_at sent, c.display_name cust
             FROM contracts k JOIN customers c ON c.id = k.customer_id
            WHERE k.organization_id = :org AND k.status = 'pending_signature' ORDER BY k.sent_at`,
          org,
        ),
        q<{ id: string; num: string; cust: string }>(
          `SELECT k.id, k.contract_number num, c.display_name cust
             FROM contracts k JOIN customers c ON c.id = k.customer_id
            WHERE k.organization_id = :org AND k.status = 'draft' ORDER BY k.created_at`,
          org,
        ),
      ]);
      const decided = Number(won!.won) + Number(won!.lost);
      sales = {
        open_estimates: Number(est!.n),
        open_estimates_value: money(est!.v),
        proposals_waiting: expiring.length,
        contracts_to_sign: unsigned.length,
        won_90d_value: money(won!.v),
        win_rate_90d: decided ? Math.round((Number(won!.won) / decided) * 100) : null,
      };
      const week = Date.now() + 7 * 86_400_000;
      for (const p of expiring.filter((p) => p.exp.getTime() < week).slice(0, 2))
        attention.push({ kind: "proposal_expiring", title: `${p.num} · ${p.cust}`, detail: `Proposal expires ${ymd(p.exp)} — not accepted yet`, href: `/estimates/${p.eid}` });
      for (const k of toSend.slice(0, 2))
        attention.push({ kind: "contract_to_send", title: `${k.num} · ${k.cust}`, detail: "Proposal accepted — send the contract for signature", href: `/contracts/${k.id}` });
      for (const k of unsigned.filter((k) => k.sent && Date.now() - k.sent.getTime() > 3 * 86_400_000).slice(0, 2))
        attention.push({ kind: "contract_unsigned", title: `${k.num} · ${k.cust}`, detail: `Waiting for signature since ${ymd(k.sent)}`, href: `/contracts/${k.id}` });
    }

    return {
      greeting_name: ((user?.get("name") as string) ?? "").split(" ")[0] ?? "",
      today,
      projects,
      work,
      money: moneyOut,
      sales,
      attention: attention.slice(0, 8),
    };
  },
};
