import type {
  SalesActivity,
  SalesLead,
  SalesOpportunity,
  SalesPipelineStage,
} from "../types";
import {
  opportunityIsOverdue,
  opportunityIsStale,
  opportunityNeedsNextAction,
  taskIsDueToday,
  taskIsOverdue,
} from "../salesExecutionViewModel";
const fold = (v: string | null | undefined) =>
  (v ?? "").toLocaleLowerCase("tr-TR");
export interface LeadUIFilters {
  search: string;
  status: string;
  assignedTo: string;
  source: string;
  overdue: boolean;
  includeArchived: boolean;
}
export function filterLeads(
  rows: SalesLead[],
  f: LeadUIFilters,
  now = new Date(),
) {
  const q = fold(f.search.trim());
  return rows.filter(
    (r) =>
      (f.includeArchived || !r.archivedAt) &&
      (!f.status || r.status === f.status) &&
      (!f.assignedTo || r.assignedTo === f.assignedTo) &&
      (!f.source || r.source === f.source) &&
      (!f.overdue || (!!r.nextActionAt && new Date(r.nextActionAt) < now)) &&
      (!q ||
        [
          r.companyName,
          r.firstName,
          r.lastName,
          r.email,
          r.phone,
          r.productInterest,
        ].some((v) => fold(v).includes(q))),
  );
}
export interface OpportunityUIFilters {
  search: string;
  pipelineId: string;
  stageId: string;
  ownerUserId: string;
  forecast: string;
  priority: string;
  state: string;
  stale: boolean;
  overdue: boolean;
  missingNextAction: boolean;
  includeArchived: boolean;
}
export function filterOpportunities(
  rows: SalesOpportunity[],
  stages: SalesPipelineStage[],
  firmNames: Map<string, string>,
  f: OpportunityUIFilters,
  now = new Date(),
) {
  const q = fold(f.search.trim());
  const map = new Map(stages.map((s) => [s.id, s]));
  return rows.filter((r) => {
    const s = map.get(r.stageId);
    if (!s) return false;
    return (
      (f.includeArchived || !r.archivedAt) &&
      (!f.pipelineId || r.pipelineId === f.pipelineId) &&
      (!f.stageId || r.stageId === f.stageId) &&
      (!f.ownerUserId || r.ownerUserId === f.ownerUserId) &&
      (!f.forecast || r.forecastCategory === f.forecast) &&
      (!f.priority || r.priority === f.priority) &&
      (!f.state ||
        (f.state === "open" ? !s.isClosed : s.outcome === f.state)) &&
      (!f.stale || opportunityIsStale(r.updatedAt, s, now)) &&
      (!f.overdue || opportunityIsOverdue(r, s, now)) &&
      (!f.missingNextAction || opportunityNeedsNextAction(r, s)) &&
      (!q ||
        fold(r.title).includes(q) ||
        fold(firmNames.get(r.partyId)).includes(q))
    );
  });
}
export type ActivityView =
  "today" | "overdue" | "week" | "all" | "mine" | "team";
export function filterActivities(
  rows: SalesActivity[],
  view: ActivityView,
  userId: string,
  now = new Date(),
) {
  const week = new Date(now);
  week.setDate(now.getDate() + 7);
  return rows.filter((a) =>
    view === "all"
      ? true
      : view === "today"
        ? taskIsDueToday(a, now)
        : view === "overdue"
          ? taskIsOverdue(a, now)
          : view === "week"
            ? !!a.dueAt && new Date(a.dueAt) >= now && new Date(a.dueAt) <= week
            : view === "mine"
              ? a.assignedTo === userId || a.ownerUserId === userId
              : view === "team" && a.assignedTo !== userId,
  );
}
export const canWriteExecution = (role: string | null | undefined) =>
  role === "owner" || role === "employee";
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
