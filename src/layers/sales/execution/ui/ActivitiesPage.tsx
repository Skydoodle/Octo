/* eslint-disable react-hooks/set-state-in-effect -- repository loads are intentionally started when company context changes */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCompanies } from "../../../../company/companyContext";
import { useAuth } from "../../../../auth/authContext";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import {
  listBusinessContacts,
  listBusinessParties,
} from "../../crm/crmRepository";
import type { BusinessContact, BusinessParty } from "../../crm/types";
import {
  archiveSalesActivity,
  completeSalesTask,
  createSalesActivity,
  listSalesActivities,
  listSalesLeads,
  listSalesOpportunities,
  updateSalesActivity,
} from "../salesExecutionRepository";
import {
  activityLabels,
  leadDisplayName,
  taskIsDueToday,
  taskIsOverdue,
} from "../salesExecutionViewModel";
import type {
  SalesActivity,
  SalesActivityCreateInput,
  SalesLead,
  SalesOpportunity,
} from "../types";
import ActivityForm from "./ActivityForm";
import {
  Badge,
  Notice,
  PageState,
  buttonPrimary,
  datetime,
} from "./ExecutionUI";
import {
  type ActivityView,
  canWriteExecution,
  filterActivities,
} from "./executionUIModel";

const views: Array<[ActivityView, string]> = [
  ["today", "Bugün"],
  ["overdue", "Geciken"],
  ["week", "Bu hafta"],
  ["all", "Tüm aktiviteler"],
  ["mine", "Bana atanan"],
  ["team", "Ekibime atanan"],
];
export default function ActivitiesPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [rows, setRows] = useState<SalesActivity[]>([]);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [parties, setParties] = useState<BusinessParty[]>([]);
  const [contacts, setContacts] = useState<BusinessContact[]>([]);
  const [opps, setOpps] = useState<SalesOpportunity[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [view, setView] = useState<ActivityView>("today");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SalesActivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [a, l, p, c, o] = await Promise.all([
      listSalesActivities(activeCompany.id, { includeArchived: false }),
      listSalesLeads(activeCompany.id),
      listBusinessParties(activeCompany.id),
      listBusinessContacts(activeCompany.id),
      listSalesOpportunities(activeCompany.id),
    ]);
    if (a.error) return setState("error");
    setRows(a.data);
    setLeads(l.data ?? []);
    setParties(p.data ?? []);
    setContacts(c.data ?? []);
    setOpps(o.data ?? []);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () => filterActivities(rows, view, user?.id ?? ""),
    [rows, view, user],
  );
  const related = (a: SalesActivity) => {
    if (a.opportunityId)
      return opps.find((o) => o.id === a.opportunityId)?.title ?? "Fırsat";
    if (a.leadId) {
      const lead = leads.find((l) => l.id === a.leadId);
      return lead ? leadDisplayName(lead) : "Potansiyel müşteri";
    }
    if (a.partyId)
      return parties.find((p) => p.id === a.partyId)?.displayName ?? "Firma";
    return "—";
  };
  const save = async (v: SalesActivityCreateInput) => {
    setSaving(true);
    const r = editing
      ? await updateSalesActivity(activeCompany!.id, editing.id, v)
      : await createSalesActivity(activeCompany!.id, v);
    setSaving(false);
    if (r.error) return setError(r.error.message);
    setModal(false);
    setEditing(null);
    setNotice(
      v.activityType === "task" ? "Görev kaydedildi." : "Aktivite kaydedildi.",
    );
    await load();
  };
  if (state === "loading")
    return (
      <main className="p-8">
        <PageState kind="loading" message="Aktiviteler yükleniyor…" />
      </main>
    );
  if (state === "error")
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Aktiviteler yüklenemedi."
          retry={() => void load()}
        />
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Aktiviteler ve Görevler</h2>
          <p className="text-sm text-ink-soft">
            Ticari temasları kaydedin; bu ekran dış e-posta veya mesaj
            göndermez.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            <Plus size={15} className="inline" /> Aktivite / görev
          </button>
        )}
      </div>
      {notice && <Notice>{notice}</Notice>}
      <nav
        aria-label="Aktivite görünümleri"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {views.map(([v, l]) => (
          <button
            type="button"
            key={v}
            onClick={() => setView(v)}
            className={`focus-ring shrink-0 rounded-full border px-3 py-2 text-sm ${view === v ? "border-crimson bg-crimson text-white" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </nav>
      {!visible.length && (
        <PageState
          kind="empty"
          message="Bu görünümde aktivite veya görev bulunmuyor."
        />
      )}
      <div className="space-y-3">
        {visible.map((a) => (
          <article
            key={a.id}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{activityLabels[a.activityType]}</Badge>
                  {a.completedAt && <Badge muted>Tamamlandı</Badge>}
                  {taskIsOverdue(a) && <Badge muted>Gecikti</Badge>}
                  {taskIsDueToday(a) && <Badge muted>Bugün</Badge>}
                  <Badge muted>
                    {a.visibility === "company"
                      ? "Tüm şirket"
                      : a.visibility === "sales_team"
                        ? "Satış ekibi"
                        : "Yalnızca ben"}
                  </Badge>
                </div>
                <h3 className="mt-2 font-medium">
                  {a.title || a.description || activityLabels[a.activityType]}
                </h3>
                <p className="text-sm text-crimson">{related(a)}</p>
                <p className="mt-2 text-xs text-ink-mute">
                  Aktivite: {datetime(a.activityAt)} · Vade: {datetime(a.dueAt)}{" "}
                  · Sahibi: {a.ownerUserId === user?.id ? "Siz" : "Ekip üyesi"}·
                  Atanan:{" "}
                  {a.assignedTo === user?.id
                    ? "Siz"
                    : a.assignedTo
                      ? "Ekip üyesi"
                      : "Atanmadı"}
                </p>
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  {a.activityType === "task" && !a.completedAt && (
                    <button
                      type="button"
                      className="text-sm text-crimson"
                      onClick={() =>
                        void completeSalesTask(activeCompany!.id, a.id).then(
                          () => {
                            setNotice("Görev tamamlandı.");
                            return load();
                          },
                        )
                      }
                    >
                      Tamamla
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-sm text-crimson"
                    onClick={() => {
                      setEditing(a);
                      setModal(true);
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="text-sm text-crimson"
                    onClick={() =>
                      void archiveSalesActivity(activeCompany!.id, a.id).then(
                        load,
                      )
                    }
                  >
                    Arşivle
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {!canWrite && (
        <p className="text-xs text-ink-mute">
          Accountant erişimi salt okunurdur ve yalnız şirket görünürlüklü
          aktiviteleri kapsar.
        </p>
      )}
      {modal && user && (
        <Modal
          title={editing ? "Aktiviteyi düzenle" : "Yeni aktivite veya görev"}
          onClose={() => setModal(false)}
          width="800px"
        >
          <ActivityForm
            activity={editing ?? undefined}
            userId={user.id}
            leads={leads}
            parties={parties}
            contacts={contacts}
            opportunities={opps}
            saving={saving}
            error={error}
            onCancel={() => setModal(false)}
            onSave={(v) => void save(v)}
          />
        </Modal>
      )}
    </main>
  );
}
