/* eslint-disable react-hooks/set-state-in-effect -- repository loads are intentionally started when route/company context changes */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, ArrowLeft, Pencil, Plus } from "lucide-react";
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
  archiveSalesOpportunity,
  completeSalesTask,
  createSalesActivity,
  createSalesOpportunity,
  getSalesOpportunity,
  listOpportunityContacts,
  listOpportunityStageHistory,
  listSalesActivities,
  listSalesOpportunities,
  listSalesPipelineStages,
  listSalesPipelines,
  setOpportunityContacts,
  updateSalesActivity,
  updateSalesOpportunity,
} from "../salesExecutionRepository";
import {
  activityLabels,
  opportunityIsOverdue,
  opportunityIsStale,
  opportunityNeedsNextAction,
  opportunityState,
} from "../salesExecutionViewModel";
import type {
  ForecastCategory,
  OpportunityContactInput,
  OpportunityStageHistory,
  SalesActivity,
  SalesActivityCreateInput,
  SalesOpportunity,
  SalesOpportunityCreateInput,
  SalesOpportunityUpdateInput,
  SalesPipeline,
  SalesPipelineStage,
  SalesPriority,
} from "../types";
import { normalizeOpportunityInput } from "../validation";
import ActivityForm from "./ActivityForm";
import QuoteLinks from "../../quotes/ui/QuoteLinks";
import {
  Badge,
  FilterBox,
  Notice,
  PageState,
  buttonPrimary,
  buttonSecondary,
  date,
  datetime,
  inputClass,
} from "./ExecutionUI";
import {
  canWriteExecution,
  filterOpportunities,
  money,
} from "./executionUIModel";

function OpportunityForm({
  value,
  userId,
  parties,
  pipelines,
  stages,
  saving,
  error,
  onCancel,
  onSave,
}: {
  value?: SalesOpportunity;
  userId: string;
  parties: BusinessParty[];
  pipelines: SalesPipeline[];
  stages: SalesPipelineStage[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (v: SalesOpportunityCreateInput) => void;
}) {
  const [f, setF] = useState({
    partyId: value?.partyId ?? "",
    pipelineId: value?.pipelineId ?? pipelines[0]?.id ?? "",
    stageId: value?.stageId ?? stages[0]?.id ?? "",
    title: value?.title ?? "",
    expectedValue: value?.expectedValue?.toString() ?? "0",
    currency: value?.currency ?? "TRY",
    expectedCloseDate: value?.expectedCloseDate ?? "",
    productInterest: value?.productInterest ?? "",
    nextAction: value?.nextAction ?? "",
    nextActionAt: value?.nextActionAt?.slice(0, 16) ?? "",
    probability: value?.probability?.toString() ?? "",
    forecastCategory:
      value?.forecastCategory ?? ("potential" as ForecastCategory),
    expectedMarginPct: value?.expectedMarginPct?.toString() ?? "",
    source: value?.source ?? "",
    priority: value?.priority ?? ("normal" as SalesPriority),
    customerNeed: value?.customerNeed ?? "",
    decisionProcess: value?.decisionProcess ?? "",
    competitors: value?.competitors ?? "",
  });
  const [validation, setValidation] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: SalesOpportunityCreateInput = {
      ...f,
      ownerUserId: userId,
      expectedValue: Number(f.expectedValue) || 0,
      probability: f.probability ? Number(f.probability) : null,
      expectedMarginPct: f.expectedMarginPct
        ? Number(f.expectedMarginPct)
        : null,
      expectedCloseDate: f.expectedCloseDate || null,
      nextActionAt: f.nextActionAt
        ? new Date(f.nextActionAt).toISOString()
        : null,
    };
    const checked = normalizeOpportunityInput(input);
    if (!checked.value) return setValidation(checked.error);
    if (!f.partyId || !f.pipelineId || !f.stageId)
      return setValidation("Firma, pipeline ve aşama zorunludur.");
    onSave(checked.value);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      {(validation || error) && <Notice error>{validation || error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Firma
          <select
            disabled={!!value}
            className={`${inputClass} mt-1`}
            value={f.partyId}
            onChange={(e) => set("partyId", e.target.value)}
          >
            <option value="">Firma seçin</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Başlık
          <input
            required
            className={`${inputClass} mt-1`}
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Pipeline
          <select
            disabled={!!value}
            className={`${inputClass} mt-1`}
            value={f.pipelineId}
            onChange={(e) => set("pipelineId", e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Aşama
          <select
            disabled={!!value}
            className={`${inputClass} mt-1`}
            value={f.stageId}
            onChange={(e) => set("stageId", e.target.value)}
          >
            {stages
              .filter((s) => s.pipelineId === f.pipelineId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Owner
          <input disabled className={`${inputClass} mt-1`} value="Siz" />
        </label>
        <label className="text-sm">
          Beklenen değer
          <input
            type="number"
            min="0"
            className={`${inputClass} mt-1`}
            value={f.expectedValue}
            onChange={(e) => set("expectedValue", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Para birimi
          <select
            className={`${inputClass} mt-1`}
            value={f.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            {["TRY", "EUR", "USD", "GBP"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Beklenen kapanış
          <input
            type="date"
            className={`${inputClass} mt-1`}
            value={f.expectedCloseDate}
            onChange={(e) => set("expectedCloseDate", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Olasılık (%)
          <input
            type="number"
            min="0"
            max="100"
            className={`${inputClass} mt-1`}
            value={f.probability}
            onChange={(e) => set("probability", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Tahmin kategorisi
          <select
            className={`${inputClass} mt-1`}
            value={f.forecastCategory}
            onChange={(e) => set("forecastCategory", e.target.value)}
          >
            <option value="committed">Taahhüt</option>
            <option value="expected">Beklenen</option>
            <option value="potential">Potansiyel</option>
            <option value="excluded">Hariç</option>
          </select>
        </label>
        <label className="text-sm">
          Öncelik
          <select
            className={`${inputClass} mt-1`}
            value={f.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            <option value="low">Düşük</option>
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
            <option value="critical">Kritik</option>
          </select>
        </label>
        <label className="text-sm">
          Beklenen marj (%)
          <input
            type="number"
            className={`${inputClass} mt-1`}
            value={f.expectedMarginPct}
            onChange={(e) => set("expectedMarginPct", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Ürün / hizmet ilgisi
          <input
            className={`${inputClass} mt-1`}
            value={f.productInterest}
            onChange={(e) => set("productInterest", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Kaynak
          <input
            className={`${inputClass} mt-1`}
            value={f.source}
            onChange={(e) => set("source", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sonraki eylem
          <input
            className={`${inputClass} mt-1`}
            value={f.nextAction}
            onChange={(e) => set("nextAction", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sonraki eylem tarihi
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={f.nextActionAt}
            onChange={(e) => set("nextActionAt", e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm">
        Müşteri ihtiyacı
        <textarea
          className={`${inputClass} mt-1`}
          value={f.customerNeed}
          onChange={(e) => set("customerNeed", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Karar süreci
        <textarea
          className={`${inputClass} mt-1`}
          value={f.decisionProcess}
          onChange={(e) => set("decisionProcess", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Rakipler
        <textarea
          className={`${inputClass} mt-1`}
          value={f.competitors}
          onChange={(e) => set("competitors", e.target.value)}
        />
      </label>
      <p className="text-xs text-ink-mute">
        Beklenen kapanış ve sonraki eylem zorunlu değildir; satış disiplini için
        güçlü biçimde önerilir.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonSecondary} onClick={onCancel}>
          Vazgeç
        </button>
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

async function loadContext(companyId: string) {
  const [p, pl] = await Promise.all([
    listBusinessParties(companyId),
    listSalesPipelines(companyId),
  ]);
  const pipelines = pl.data ?? [];
  const stageResults = await Promise.all(
    pipelines.map((x) => listSalesPipelineStages(companyId, x.id)),
  );
  return {
    parties: p.data ?? [],
    pipelines,
    stages: stageResults.flatMap((x) => x.data ?? []),
  };
}
export function OpportunitiesPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [rows, setRows] = useState<SalesOpportunity[]>([]);
  const [parties, setParties] = useState<BusinessParty[]>([]);
  const [pipelines, setPipelines] = useState<SalesPipeline[]>([]);
  const [stages, setStages] = useState<SalesPipelineStage[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [f, setF] = useState({
    search: "",
    pipelineId: "",
    stageId: "",
    ownerUserId: "",
    forecast: "",
    priority: "",
    state: "",
    stale: false,
    overdue: false,
    missingNextAction: false,
    includeArchived: false,
  });
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [r, c] = await Promise.all([
      listSalesOpportunities(activeCompany.id, { includeArchived: true }),
      loadContext(activeCompany.id),
    ]);
    if (r.error) return setState("error");
    setRows(r.data);
    setParties(c.parties);
    setPipelines(c.pipelines);
    setStages(c.stages);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const names = useMemo(
    () => new Map(parties.map((p) => [p.id, p.displayName])),
    [parties],
  );
  const visible = useMemo(
    () => filterOpportunities(rows, stages, names, f),
    [rows, stages, names, f],
  );
  const save = async (v: SalesOpportunityCreateInput) => {
    const r = await createSalesOpportunity(activeCompany!.id, v);
    if (r.error) return setError(r.error.message);
    setModal(false);
    setNotice("Fırsat oluşturuldu.");
    await load();
  };
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <div className="flex justify-between">
        <div>
          <h2 className="font-serif text-2xl">Fırsatlar</h2>
          <p className="text-sm text-ink-soft">
            Açık ticari işlemleri ve sonraki eylemleri yönetin.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => setModal(true)}
          >
            <Plus size={15} className="inline" /> Yeni fırsat
          </button>
        )}
      </div>
      {notice && <Notice>{notice}</Notice>}
      <FilterBox>
        <input
          aria-label="Fırsat ara"
          className={inputClass}
          placeholder="Fırsat veya firma ara"
          value={f.search}
          onChange={(e) => setF((x) => ({ ...x, search: e.target.value }))}
        />
        <select
          aria-label="Pipeline filtresi"
          className={inputClass}
          value={f.pipelineId}
          onChange={(e) => setF((x) => ({ ...x, pipelineId: e.target.value }))}
        >
          <option value="">Tüm pipeline’lar</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Aşama filtresi"
          className={inputClass}
          value={f.stageId}
          onChange={(e) => setF((x) => ({ ...x, stageId: e.target.value }))}
        >
          <option value="">Tüm aşamalar</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Durum filtresi"
          className={inputClass}
          value={f.state}
          onChange={(e) => setF((x) => ({ ...x, state: e.target.value }))}
        >
          <option value="">Açık ve kapalı</option>
          <option value="open">Açık</option>
          <option value="won">Kazanıldı</option>
          <option value="lost">Kaybedildi</option>
        </select>
        <select
          aria-label="Tahmin filtresi"
          className={inputClass}
          value={f.forecast}
          onChange={(e) => setF((x) => ({ ...x, forecast: e.target.value }))}
        >
          <option value="">Tüm tahmin kategorileri</option>
          <option value="committed">Taahhüt</option>
          <option value="expected">Beklenen</option>
          <option value="potential">Potansiyel</option>
          <option value="excluded">Hariç</option>
        </select>
        <select
          aria-label="Fırsat sahibi filtresi"
          className={inputClass}
          value={f.ownerUserId}
          onChange={(e) => setF((x) => ({ ...x, ownerUserId: e.target.value }))}
        >
          <option value="">Tüm sahipler</option>
          {user && <option value={user.id}>Sahibi olduğum</option>}
        </select>
        <select
          aria-label="Öncelik filtresi"
          className={inputClass}
          value={f.priority}
          onChange={(e) => setF((x) => ({ ...x, priority: e.target.value }))}
        >
          <option value="">Tüm öncelikler</option>
          <option value="low">Düşük</option>
          <option value="normal">Normal</option>
          <option value="high">Yüksek</option>
          <option value="critical">Kritik</option>
        </select>
        <div className="col-span-full flex flex-wrap gap-3 text-sm">
          {[
            ["stale", "Durgun"],
            ["overdue", "Gecikmiş kapanış"],
            ["missingNextAction", "Sonraki eylem eksik"],
            ["includeArchived", "Arşiv"],
          ].map(([k, l]) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={Boolean(f[k as keyof typeof f])}
                onChange={(e) => setF((x) => ({ ...x, [k]: e.target.checked }))}
              />{" "}
              {l}
            </label>
          ))}
        </div>
      </FilterBox>
      {state === "loading" && (
        <PageState kind="loading" message="Fırsatlar yükleniyor…" />
      )}
      {state === "error" && (
        <PageState
          kind="error"
          message="Fırsatlar yüklenemedi."
          retry={() => void load()}
        />
      )}{" "}
      {state === "ready" && !visible.length && (
        <PageState
          kind="empty"
          message={
            rows.length
              ? "Filtrelerle eşleşen fırsat bulunamadı."
              : "Henüz fırsat bulunmuyor."
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((o) => {
          const s = stages.find((x) => x.id === o.stageId)!;
          return (
            <Link
              key={o.id}
              to={o.id}
              className="rounded-card border border-line bg-surface p-5 hover:border-crimson/30"
            >
              <div className="flex justify-between">
                <h3 className="font-medium">{o.title}</h3>
                <Badge>{s?.name}</Badge>
              </div>
              <p className="text-sm text-crimson">{names.get(o.partyId)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {opportunityNeedsNextAction(o, s) && (
                  <Badge muted>Sonraki eylem eksik</Badge>
                )}
                {opportunityIsStale(o.updatedAt, s) && (
                  <Badge muted>Durgun</Badge>
                )}
                {opportunityIsOverdue(o, s) && (
                  <Badge muted>Kapanış gecikti</Badge>
                )}
                <Badge muted>{o.forecastCategory}</Badge>
                <Badge muted>{o.priority}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-ink-mute">Değer</dt>
                  <dd>{money(o.expectedValue, o.currency)}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Olasılık</dt>
                  <dd>%{o.probability}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Kapanış</dt>
                  <dd>{date(o.expectedCloseDate)}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Sonraki eylem</dt>
                  <dd>{o.nextAction || "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Sahibi</dt>
                  <dd>{o.ownerUserId === user?.id ? "Siz" : "Ekip üyesi"}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
      {modal && user && (
        <Modal
          title="Yeni fırsat"
          onClose={() => setModal(false)}
          width="800px"
        >
          <OpportunityForm
            userId={user.id}
            parties={parties}
            pipelines={pipelines}
            stages={stages}
            saving={saving}
            error={error}
            onCancel={() => setModal(false)}
            onSave={(v) => {
              setSaving(true);
              void save(v).finally(() => setSaving(false));
            }}
          />
        </Modal>
      )}
    </main>
  );
}

export function OpportunityDetailPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const { opportunityId = "" } = useParams();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [o, setO] = useState<SalesOpportunity | null>(null);
  const [parties, setParties] = useState<BusinessParty[]>([]);
  const [pipelines, setPipelines] = useState<SalesPipeline[]>([]);
  const [stages, setStages] = useState<SalesPipelineStage[]>([]);
  const [contacts, setContacts] = useState<BusinessContact[]>([]);
  const [linked, setLinked] = useState<OpportunityContactInput[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [editingActivity, setEditingActivity] = useState<SalesActivity | null>(
    null,
  );
  const [history, setHistory] = useState<OpportunityStageHistory[]>([]);
  const [state, setState] = useState<
    "loading" | "error" | "notfound" | "ready"
  >("loading");
  const [modal, setModal] = useState<"edit" | "contacts" | "activity" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const base = await getSalesOpportunity(
      activeCompany.id,
      opportunityId,
      true,
    );
    if (base.error)
      return setState(base.error.code === "not_found" ? "notfound" : "error");
    const ctx = await loadContext(activeCompany.id);
    const [c, l, a, h] = await Promise.all([
      listBusinessContacts(activeCompany.id, base.data.partyId),
      listOpportunityContacts(activeCompany.id, opportunityId),
      listSalesActivities(activeCompany.id, { opportunityId }),
      listOpportunityStageHistory(activeCompany.id, opportunityId),
    ]);
    setO(base.data);
    setParties(ctx.parties);
    setPipelines(ctx.pipelines);
    setStages(ctx.stages);
    setContacts(c.data ?? []);
    setLinked(
      (l.data ?? []).map((x) => ({
        contactId: x.contactId,
        relationshipRole: x.relationshipRole,
        isPrimary: x.isPrimary,
      })),
    );
    setActivities(a.data ?? []);
    setHistory(h.data ?? []);
    setState("ready");
  }, [activeCompany, opportunityId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === "loading")
    return (
      <main className="p-8">
        <PageState kind="loading" message="Fırsat yükleniyor…" />
      </main>
    );
  if (state !== "ready" || !o)
    return (
      <main className="p-8">
        <PageState
          kind={state === "error" ? "error" : "empty"}
          message={
            state === "error" ? "Fırsat yüklenemedi." : "Fırsat bulunamadı."
          }
        />
      </main>
    );
  const stage = stages.find((s) => s.id === o.stageId)!;
  const party = parties.find((p) => p.id === o.partyId);
  const saveContacts = async () => {
    setSaving(true);
    const r = await setOpportunityContacts(activeCompany!.id, o.id, linked);
    setSaving(false);
    if (r.error) return setError(r.error.message);
    setModal(null);
    setNotice("Fırsat kişileri güncellendi.");
    await load();
  };
  const saveActivity = async (v: SalesActivityCreateInput) => {
    const r = editingActivity
      ? await updateSalesActivity(activeCompany!.id, editingActivity.id, v)
      : await createSalesActivity(activeCompany!.id, v);
    if (r.error) return setError(r.error.message);
    setModal(null);
    setEditingActivity(null);
    setNotice(
      v.activityType === "task"
        ? "Görev oluşturuldu."
        : "Aktivite oluşturuldu.",
    );
    await load();
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <Link to=".." relative="path" className="text-sm text-crimson">
        <ArrowLeft size={15} className="inline" /> Fırsatlara dön
      </Link>
      {notice && <Notice>{notice}</Notice>}
      <header className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap justify-between">
          <div>
            <h1 className="font-serif text-3xl">{o.title}</h1>
            <Link
              to={`/dashboard/satis/firmalar/${o.partyId}`}
              className="text-crimson"
            >
              {party?.displayName}
            </Link>
            <div className="mt-3 flex gap-2">
              <Badge>{stage.name}</Badge>
              <Badge muted>
                {opportunityState(stage) === "open"
                  ? "Açık"
                  : opportunityState(stage) === "won"
                    ? "Kazanıldı"
                    : "Kaybedildi"}
              </Badge>
            </div>
          </div>
          {canWrite && !o.archivedAt && (
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setModal("edit")}
              >
                <Pencil size={15} className="inline" /> Düzenle
              </button>
              <button
                type="button"
                className={buttonSecondary}
                onClick={() =>
                  void archiveSalesOpportunity(activeCompany!.id, o.id).then(
                    load,
                  )
                }
              >
                <Archive size={15} className="inline" /> Arşivle
              </button>
            </div>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-mute">Değer</dt>
            <dd>{money(o.expectedValue, o.currency)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Olasılık</dt>
            <dd>%{o.probability}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Tahmin</dt>
            <dd>{o.forecastCategory}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Öncelik</dt>
            <dd>{o.priority}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Sahibi</dt>
            <dd>{o.ownerUserId === user?.id ? "Siz" : "Ekip üyesi"}</dd>
          </div>
        </dl>
      </header>
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Genel Bilgiler</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            ["Beklenen kapanış", date(o.expectedCloseDate)],
            ["Ürün / hizmet", o.productInterest],
            ["Kaynak", o.source],
            [
              "Beklenen marj",
              o.expectedMarginPct == null ? "—" : `%${o.expectedMarginPct}`,
            ],
            ["Müşteri ihtiyacı", o.customerNeed],
            ["Karar süreci", o.decisionProcess],
            ["Rakipler", o.competitors],
            ["Kayıp nedeni", o.lossReason],
            ["Oluşturuldu", date(o.createdAt)],
            ["Güncellendi", date(o.updatedAt)],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-ink-mute">{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Sonraki Eylem</h2>
        {opportunityNeedsNextAction(o, stage) && (
          <Notice error>Açık fırsatta sonraki eylem ve tarihi eksik.</Notice>
        )}
        {opportunityIsOverdue(o, stage) && (
          <Notice error>Beklenen kapanış tarihi geçti.</Notice>
        )}
        <p className="mt-3">
          {o.nextAction || "Belirtilmedi"} · {datetime(o.nextActionAt)}
        </p>
      </section>
      <QuoteLinks
        companyId={activeCompany!.id}
        opportunityId={o.id}
        canWrite={canWrite && !o.archivedAt}
      />
      <section className="rounded-card border border-line bg-surface p-6">
        <div className="flex justify-between">
          <h2 className="font-serif text-xl">Kişiler</h2>
          {canWrite && (
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setModal("contacts")}
            >
              Kişileri yönet
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {linked.map((x) => {
            const c = contacts.find((v) => v.id === x.contactId);
            return (
              <div key={x.contactId}>
                {c?.firstName} {c?.lastName}{" "}
                {x.isPrimary && <Badge>Birincil</Badge>}
              </div>
            );
          })}
          {!linked.length && (
            <p className="text-sm text-ink-soft">Bağlı kişi yok.</p>
          )}
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-6">
        <div className="flex justify-between">
          <h2 className="font-serif text-xl">Aktiviteler</h2>
          {canWrite && (
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => {
                setEditingActivity(null);
                setModal("activity");
              }}
            >
              Aktivite / görev ekle
            </button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {activities.map((a) => (
            <article key={a.id} className="rounded-lg border border-line p-3">
              <div className="flex justify-between">
                <div>
                  <Badge>{activityLabels[a.activityType]}</Badge>{" "}
                  <strong>{a.title || a.description}</strong>
                  <p className="text-xs text-ink-mute">
                    {datetime(a.activityAt)} · {a.visibility}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex gap-2">
                    {a.activityType === "task" && !a.completedAt && (
                      <button
                        type="button"
                        className="text-xs text-crimson"
                        onClick={() =>
                          void completeSalesTask(activeCompany!.id, a.id).then(
                            load,
                          )
                        }
                      >
                        Tamamla
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-crimson"
                      onClick={() => {
                        setEditingActivity(a);
                        setModal("activity");
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="text-xs text-crimson"
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
          {!activities.length && (
            <p className="text-sm text-ink-soft">Aktivite yok.</p>
          )}
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Aşama Geçmişi</h2>
        <div className="mt-4 space-y-2">
          {history.map((h) => (
            <div key={h.id} className="border-b border-line pb-2 text-sm">
              {stages.find((s) => s.id === h.fromStageId)?.name || "Başlangıç"}{" "}
              → {stages.find((s) => s.id === h.toStageId)?.name} ·{" "}
              {datetime(h.changedAt)} · {h.reason || "Neden belirtilmedi"} ·{" "}
              {h.daysInPreviousStage?.toFixed(1) ?? "—"} gün
            </div>
          ))}
          {!history.length && (
            <p className="text-sm text-ink-soft">
              Henüz aşama değişikliği yok.
            </p>
          )}
        </div>
      </section>
      {modal === "edit" && user && (
        <Modal
          title="Fırsatı düzenle"
          onClose={() => setModal(null)}
          width="800px"
        >
          <OpportunityForm
            value={o}
            userId={user.id}
            parties={parties}
            pipelines={pipelines}
            stages={stages}
            saving={saving}
            error={error}
            onCancel={() => setModal(null)}
            onSave={(v) => {
              const changes: SalesOpportunityUpdateInput = {
                title: v.title,
                expectedValue: v.expectedValue,
                currency: v.currency,
                expectedCloseDate: v.expectedCloseDate,
                productInterest: v.productInterest,
                nextAction: v.nextAction,
                nextActionAt: v.nextActionAt,
                probability: v.probability,
                forecastCategory: v.forecastCategory,
                expectedMarginPct: v.expectedMarginPct,
                source: v.source,
                priority: v.priority,
                customerNeed: v.customerNeed,
                decisionProcess: v.decisionProcess,
                competitors: v.competitors,
              };
              setSaving(true);
              void updateSalesOpportunity(
                activeCompany!.id,
                o.id,
                changes,
              ).then((r) => {
                setSaving(false);
                if (r.error) setError(r.error.message);
                else {
                  setModal(null);
                  void load();
                }
              });
            }}
          />
        </Modal>
      )}
      {modal === "contacts" && (
        <Modal title="Fırsat kişileri" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {contacts.map((c) => {
              const selected = linked.find((x) => x.contactId === c.id);
              return (
                <div
                  key={c.id}
                  className="flex justify-between rounded border border-line p-3"
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={(e) =>
                        setLinked((x) =>
                          e.target.checked
                            ? [...x, { contactId: c.id, isPrimary: false }]
                            : x.filter((v) => v.contactId !== c.id),
                        )
                      }
                    />{" "}
                    {c.firstName} {c.lastName}
                  </label>
                  {selected && (
                    <label>
                      <input
                        type="radio"
                        name="primary"
                        checked={selected.isPrimary}
                        onChange={() =>
                          setLinked((x) =>
                            x.map((v) => ({
                              ...v,
                              isPrimary: v.contactId === c.id,
                            })),
                          )
                        }
                      />{" "}
                      Birincil
                    </label>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end">
              <button
                type="button"
                className={buttonPrimary}
                disabled={saving}
                onClick={() => void saveContacts()}
              >
                Kaydet
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "activity" && user && (
        <Modal
          title={editingActivity ? "Aktiviteyi düzenle" : "Aktivite veya görev"}
          onClose={() => {
            setEditingActivity(null);
            setModal(null);
          }}
          width="760px"
        >
          <ActivityForm
            activity={editingActivity ?? undefined}
            userId={user.id}
            leads={[]}
            parties={parties}
            contacts={contacts}
            opportunities={[o]}
            fixedOpportunityId={o.id}
            saving={saving}
            error={error}
            onCancel={() => setModal(null)}
            onSave={(v) => void saveActivity(v)}
          />
        </Modal>
      )}
    </main>
  );
}
