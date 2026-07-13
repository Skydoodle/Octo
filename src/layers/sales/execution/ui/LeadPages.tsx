/* eslint-disable react-hooks/set-state-in-effect -- repository loads are intentionally started when route/company context changes */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Pencil,
  Plus,
  Search,
  Shuffle,
} from "lucide-react";
import { useCompanies } from "../../../../company/companyContext";
import { useAuth } from "../../../../auth/authContext";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import { listBusinessParties } from "../../crm/crmRepository";
import type { BusinessParty } from "../../crm/types";
import {
  archiveSalesLead,
  convertSalesLead,
  createSalesLead,
  getDefaultSalesPipeline,
  getSalesLead,
  listSalesLeads,
  listSalesPipelineStages,
  updateSalesLead,
} from "../salesExecutionRepository";
import { leadDisplayName, leadStatusLabels } from "../salesExecutionViewModel";
import type {
  Currency,
  LeadConversionResult,
  SalesLead,
  SalesLeadCreateInput,
  SalesLeadStatus,
  SalesPipeline,
  SalesPipelineStage,
} from "../types";
import { normalizeLeadInput } from "../validation";
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
import { canWriteExecution, filterLeads, money } from "./executionUIModel";

const empty = {
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  source: "",
  productInterest: "",
  status: "new" as SalesLeadStatus,
  estimatedValue: "",
  currency: "TRY" as Currency,
  qualificationNotes: "",
  nextAction: "",
  nextActionAt: "",
  disqualificationReason: "",
  assignedTo: "",
};
function LeadForm({
  lead,
  userId,
  saving,
  error,
  onCancel,
  onSave,
}: {
  lead?: SalesLead;
  userId: string;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (v: SalesLeadCreateInput) => void;
}) {
  const [f, setF] = useState(() =>
    lead
      ? {
          companyName: lead.companyName ?? "",
          firstName: lead.firstName ?? "",
          lastName: lead.lastName ?? "",
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          source: lead.source ?? "",
          productInterest: lead.productInterest ?? "",
          status: lead.status,
          estimatedValue: lead.estimatedValue?.toString() ?? "",
          currency: lead.currency,
          qualificationNotes: lead.qualificationNotes ?? "",
          nextAction: lead.nextAction ?? "",
          nextActionAt: lead.nextActionAt?.slice(0, 16) ?? "",
          disqualificationReason: lead.disqualificationReason ?? "",
          assignedTo: lead.assignedTo ?? "",
        }
      : empty,
  );
  const [validation, setValidation] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = {
      ...f,
      estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : null,
      nextActionAt: f.nextActionAt
        ? new Date(f.nextActionAt).toISOString()
        : null,
    };
    const checked = normalizeLeadInput(input);
    if (!checked.value) return setValidation(checked.error);
    onSave(checked.value);
  };
  const field = (k: keyof typeof f, v: string) =>
    setF((x) => ({ ...x, [k]: v }));
  return (
    <form onSubmit={submit} className="space-y-4">
      {(validation || error) && <Notice error>{validation || error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Firma adı
          <input
            className={`${inputClass} mt-1`}
            value={f.companyName}
            onChange={(e) => field("companyName", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Ad
          <input
            className={`${inputClass} mt-1`}
            value={f.firstName}
            onChange={(e) => field("firstName", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Soyad
          <input
            className={`${inputClass} mt-1`}
            value={f.lastName}
            onChange={(e) => field("lastName", e.target.value)}
          />
        </label>
        <label className="text-sm">
          E-posta
          <input
            type="email"
            className={`${inputClass} mt-1`}
            value={f.email}
            onChange={(e) => field("email", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Telefon
          <input
            className={`${inputClass} mt-1`}
            value={f.phone}
            onChange={(e) => field("phone", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Kaynak
          <input
            className={`${inputClass} mt-1`}
            value={f.source}
            onChange={(e) => field("source", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Ürün / hizmet ilgisi
          <input
            className={`${inputClass} mt-1`}
            value={f.productInterest}
            onChange={(e) => field("productInterest", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(f.assignedTo)}
            onChange={(e) =>
              field("assignedTo", e.target.checked ? userId : "")
            }
          />
          Kendime ata
        </label>
        <label className="text-sm">
          Durum
          <select
            className={`${inputClass} mt-1`}
            value={f.status}
            onChange={(e) => field("status", e.target.value)}
          >
            {Object.entries(leadStatusLabels)
              .filter(([v]) => v !== "converted")
              .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Tahmini değer
          <input
            min="0"
            type="number"
            className={`${inputClass} mt-1`}
            value={f.estimatedValue}
            onChange={(e) => field("estimatedValue", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Para birimi
          <select
            className={`${inputClass} mt-1`}
            value={f.currency}
            onChange={(e) => field("currency", e.target.value)}
          >
            {["TRY", "EUR", "USD", "GBP"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Sonraki eylem
          <input
            className={`${inputClass} mt-1`}
            value={f.nextAction}
            onChange={(e) => field("nextAction", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sonraki eylem tarihi
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={f.nextActionAt}
            onChange={(e) => field("nextActionAt", e.target.value)}
          />
        </label>
      </div>
      {f.status === "disqualified" && (
        <label className="block text-sm">
          Uygun bulunmama nedeni
          <textarea
            required
            className={`${inputClass} mt-1`}
            value={f.disqualificationReason}
            onChange={(e) => field("disqualificationReason", e.target.value)}
          />
        </label>
      )}
      <label className="block text-sm">
        Nitelendirme notları
        <textarea
          className={`${inputClass} mt-1`}
          value={f.qualificationNotes}
          onChange={(e) => field("qualificationNotes", e.target.value)}
        />
      </label>
      <p className="text-xs text-ink-mute">
        Firma adı veya Ad alanlarından en az biri zorunludur. Atama
        yapılmadığında kayıt ekip havuzunda kalır.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonSecondary} onClick={onCancel}>
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={saving || lead?.status === "converted"}
          className={buttonPrimary}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function ConversionModal({
  lead,
  companyId,
  userId,
  onClose,
  onDone,
}: {
  lead: SalesLead;
  companyId: string;
  userId: string;
  onClose: () => void;
  onDone: (r: LeadConversionResult) => void;
}) {
  const [firms, setFirms] = useState<BusinessParty[]>([]);
  const [pipeline, setPipeline] = useState<SalesPipeline | null>(null);
  const [stages, setStages] = useState<SalesPipelineStage[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [firmId, setFirmId] = useState("");
  const [newName, setNewName] = useState(
    lead.companyName ?? leadDisplayName(lead),
  );
  const [contact, setContact] = useState(Boolean(lead.firstName));
  const [title, setTitle] = useState(`${leadDisplayName(lead)} fırsatı`);
  const [value, setValue] = useState(lead.estimatedValue?.toString() ?? "0");
  const [currency, setCurrency] = useState<Currency>(lead.currency);
  const [closeDate, setCloseDate] = useState("");
  const [next, setNext] = useState(lead.nextAction ?? "");
  const [nextAt, setNextAt] = useState(lead.nextActionAt?.slice(0, 16) ?? "");
  const [stageId, setStageId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([
      listBusinessParties(companyId),
      getDefaultSalesPipeline(companyId),
    ]).then(async ([f, p]) => {
      if (f.data) setFirms(f.data);
      if (p.data) {
        setPipeline(p.data);
        const s = await listSalesPipelineStages(companyId, p.data.id);
        if (s.data) {
          setStages(s.data);
          setStageId(s.data.find((x) => !x.isClosed)?.id ?? "");
        }
      }
    });
  }, [companyId]);
  const submit = async () => {
    if (mode === "existing" && !firmId)
      return setError("Mevcut firma seçilmelidir.");
    if (mode === "new" && !newName.trim())
      return setError("Yeni firma adı gereklidir.");
    setSaving(true);
    setError(null);
    const r = await convertSalesLead(companyId, {
      leadId: lead.id,
      existingPartyId: mode === "existing" ? firmId : null,
      newPartyDisplayName: mode === "new" ? newName : null,
      createContact: contact,
      opportunityTitle: title,
      pipelineId: pipeline?.id,
      stageId,
      expectedValue: Number(value) || 0,
      currency,
      ownerUserId: userId,
      expectedCloseDate: closeDate || null,
      productInterest: lead.productInterest,
      nextAction: next || null,
      nextActionAt: nextAt ? new Date(nextAt).toISOString() : null,
    });
    setSaving(false);
    if (r.error) return setError(r.error.message);
    onDone(r.data);
  };
  return (
    <Modal
      title="Potansiyel müşteriyi dönüştür"
      onClose={onClose}
      width="760px"
    >
      {error && <Notice error>{error}</Notice>}
      {!confirm ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Firma seçimi</legend>
            <div className="mt-2 flex gap-4">
              <label>
                <input
                  type="radio"
                  checked={mode === "existing"}
                  onChange={() => setMode("existing")}
                />{" "}
                Mevcut firma
              </label>
              <label>
                <input
                  type="radio"
                  checked={mode === "new"}
                  onChange={() => setMode("new")}
                />{" "}
                Yeni firma
              </label>
            </div>
          </fieldset>
          {mode === "existing" ? (
            <label className="block text-sm">
              Firma
              <select
                className={`${inputClass} mt-1`}
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
              >
                <option value="">Firma seçin</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm">
              Yeni firma adı
              <input
                className={`${inputClass} mt-1`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
          )}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={contact}
              onChange={(e) => setContact(e.target.checked)}
            />
            Lead’de kişi adı varsa ilgili kişi oluştur
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Fırsat başlığı
              <input
                className={`${inputClass} mt-1`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Başlangıç aşaması
              <select
                className={`${inputClass} mt-1`}
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              >
                {stages
                  .filter((s) => !s.isClosed)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Beklenen değer
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-1`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Para birimi
              <select
                className={`${inputClass} mt-1`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {["TRY", "EUR", "USD", "GBP"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Owner
              <input disabled className={`${inputClass} mt-1`} value="Siz" />
            </label>
            <label className="text-sm">
              Beklenen kapanış
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Sonraki eylem
              <input
                className={`${inputClass} mt-1`}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Sonraki eylem tarihi
              <input
                type="datetime-local"
                className={`${inputClass} mt-1`}
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setConfirm(true)}
            >
              Özeti kontrol et
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium">Dönüşüm özeti</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-mute">Firma</dt>
              <dd>
                {mode === "existing"
                  ? firms.find((f) => f.id === firmId)?.displayName
                  : newName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-mute">Fırsat</dt>
              <dd>{title}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-mute">Değer</dt>
              <dd>{money(Number(value) || 0, currency)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-mute">Aşama</dt>
              <dd>{stages.find((s) => s.id === stageId)?.name}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setConfirm(false)}
            >
              Geri
            </button>
            <button
              type="button"
              disabled={saving}
              className={buttonPrimary}
              onClick={() => void submit()}
            >
              {saving ? "Dönüştürülüyor…" : "Dönüşümü onayla"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function LeadsPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [rows, setRows] = useState<SalesLead[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [f, setF] = useState({
    search: "",
    status: "",
    assignedTo: "",
    source: "",
    overdue: false,
    includeArchived: false,
  });
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const r = await listSalesLeads(activeCompany.id, { includeArchived: true });
    if (r.error) return setState("error");
    setRows(r.data);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(() => filterLeads(rows, f), [rows, f]);
  const save = async (input: SalesLeadCreateInput) => {
    setSaving(true);
    const r = await createSalesLead(activeCompany!.id, input);
    setSaving(false);
    if (r.error) return setError(r.error.message);
    setModal(false);
    setNotice("Potansiyel müşteri oluşturuldu.");
    await load();
  };
  const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))];
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Potansiyel Müşteriler</h2>
          <p className="text-sm text-ink-soft">
            Nitelendirme öncesi ticari talepleri ve sonraki eylemleri yönetin.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => setModal(true)}
          >
            <Plus size={16} className="mr-1 inline" />
            Yeni potansiyel müşteri
          </button>
        )}
      </div>
      {notice && <Notice>{notice}</Notice>}
      <FilterBox>
        <label className="relative">
          <Search size={15} className="absolute left-3 top-3" />
          <input
            aria-label="Potansiyel müşteri ara"
            className={`${inputClass} pl-9`}
            placeholder="Ad, firma, e-posta ara"
            value={f.search}
            onChange={(e) => setF((x) => ({ ...x, search: e.target.value }))}
          />
        </label>
        <select
          aria-label="Durum filtresi"
          className={inputClass}
          value={f.status}
          onChange={(e) => setF((x) => ({ ...x, status: e.target.value }))}
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(leadStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Kaynak filtresi"
          className={inputClass}
          value={f.source}
          onChange={(e) => setF((x) => ({ ...x, source: e.target.value }))}
        >
          <option value="">Tüm kaynaklar</option>
          {sources.map((v) => (
            <option key={v!}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Atanan kullanıcı filtresi"
          className={inputClass}
          value={f.assignedTo}
          onChange={(e) => setF((x) => ({ ...x, assignedTo: e.target.value }))}
        >
          <option value="">Tüm atamalar</option>
          {user && <option value={user.id}>Bana atanan</option>}
        </select>
        <div className="flex flex-wrap gap-3 text-sm">
          <label>
            <input
              type="checkbox"
              checked={f.overdue}
              onChange={(e) =>
                setF((x) => ({ ...x, overdue: e.target.checked }))
              }
            />{" "}
            Geciken takip
          </label>
          <label>
            <input
              type="checkbox"
              checked={f.includeArchived}
              onChange={(e) =>
                setF((x) => ({ ...x, includeArchived: e.target.checked }))
              }
            />{" "}
            Arşiv
          </label>
        </div>
      </FilterBox>
      {state === "loading" && (
        <PageState kind="loading" message="Potansiyel müşteriler yükleniyor…" />
      )}
      {state === "error" && (
        <PageState
          kind="error"
          message="Potansiyel müşteriler yüklenemedi."
          retry={() => void load()}
        />
      )}{" "}
      {state === "ready" && !visible.length && (
        <PageState
          kind="empty"
          message={
            rows.length
              ? "Filtrelerle eşleşen kayıt bulunamadı."
              : "Henüz potansiyel müşteri bulunmuyor."
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((r) => (
          <Link
            key={r.id}
            to={r.id}
            className="rounded-card border border-line bg-surface p-5 hover:border-crimson/30"
          >
            <div className="flex justify-between gap-2">
              <h3 className="font-medium">{leadDisplayName(r)}</h3>
              <Badge>{leadStatusLabels[r.status]}</Badge>
            </div>
            {r.companyName && r.firstName && (
              <p className="text-sm text-ink-soft">
                {r.firstName} {r.lastName}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-ink-mute">Değer</dt>
                <dd>
                  {r.estimatedValue == null
                    ? "—"
                    : money(r.estimatedValue, r.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-mute">Kaynak</dt>
                <dd>{r.source || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-mute">Sonraki eylem</dt>
                <dd>{r.nextAction || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-mute">Tarih</dt>
                <dd>{datetime(r.nextActionAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-mute">Atanan</dt>
                <dd>
                  {r.assignedTo
                    ? r.assignedTo === user?.id
                      ? "Siz"
                      : "Ekip üyesi"
                    : "Atanmadı"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-mute">Güncellendi</dt>
                <dd>{date(r.updatedAt)}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
      {!canWrite && (
        <p className="text-xs text-ink-mute">Bu görünüm salt okunurdur.</p>
      )}
      {modal && (
        <Modal
          title="Yeni potansiyel müşteri"
          onClose={() => setModal(false)}
          width="760px"
        >
          <LeadForm
            userId={user?.id ?? ""}
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

export function LeadDetailPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const { leadId = "" } = useParams();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [state, setState] = useState<
    "loading" | "error" | "notfound" | "ready"
  >("loading");
  const [modal, setModal] = useState<"edit" | "convert" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadConversionResult | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const r = await getSalesLead(activeCompany.id, leadId, true);
    if (r.error)
      return setState(r.error.code === "not_found" ? "notfound" : "error");
    setLead(r.data);
    setState("ready");
  }, [activeCompany, leadId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === "loading")
    return (
      <main className="p-8">
        <PageState kind="loading" message="Potansiyel müşteri yükleniyor…" />
      </main>
    );
  if (state !== "ready" || !lead)
    return (
      <main className="p-8">
        <PageState
          kind={state === "error" ? "error" : "empty"}
          message={
            state === "error" ? "Kayıt yüklenemedi." : "Kayıt bulunamadı."
          }
        />
      </main>
    );
  const save = async (v: SalesLeadCreateInput) => {
    setSaving(true);
    const r = await updateSalesLead(activeCompany!.id, lead.id, v);
    setSaving(false);
    if (r.error) return setError(r.error.message);
    setModal(null);
    await load();
  };
  const archive = async () => {
    await archiveSalesLead(activeCompany!.id, lead.id);
    await load();
  };
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8">
      <Link to=".." relative="path" className="text-sm text-crimson">
        <ArrowLeft size={15} className="inline" /> Listeye dön
      </Link>
      {result && (
        <Notice>
          Potansiyel müşteri başarıyla dönüştürüldü.{" "}
          <Link
            className="underline"
            to={`/dashboard/satis/firmalar/${result.partyId}`}
          >
            Firmayı aç
          </Link>{" "}
          ·{" "}
          <Link
            className="underline"
            to={`/dashboard/satis/firsatlar/${result.opportunityId}`}
          >
            Fırsatı aç
          </Link>
          {result.contactId && (
            <>
              {" · "}
              <Link className="underline" to="/dashboard/satis/kisiler">
                Kişiyi görüntüle
              </Link>
            </>
          )}
        </Notice>
      )}
      <header className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">{leadDisplayName(lead)}</h1>
            <div className="mt-2">
              <Badge>{leadStatusLabels[lead.status]}</Badge>
            </div>
          </div>
          {canWrite && !lead.archivedAt && lead.status !== "converted" && (
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setModal("edit")}
              >
                <Pencil size={15} className="inline" /> Düzenle
              </button>
              {lead.status === "qualified" && (
                <button
                  type="button"
                  className={buttonPrimary}
                  onClick={() => setModal("convert")}
                >
                  <Shuffle size={15} className="inline" /> Dönüştür
                </button>
              )}
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => void archive()}
              >
                <Archive size={15} className="inline" /> Arşivle
              </button>
            </div>
          )}
        </div>
      </header>
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Genel Bilgiler</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            ["Kişi", [lead.firstName, lead.lastName].filter(Boolean).join(" ")],
            ["E-posta", lead.email],
            ["Telefon", lead.phone],
            ["Kaynak", lead.source],
            ["İlgi", lead.productInterest],
            [
              "Değer",
              lead.estimatedValue == null
                ? "—"
                : money(lead.estimatedValue, lead.currency),
            ],
            ["Sonraki eylem", lead.nextAction],
            ["Sonraki eylem tarihi", datetime(lead.nextActionAt)],
            ["Notlar", lead.qualificationNotes],
            ["Güncellendi", date(lead.updatedAt)],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-ink-mute">{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
      {modal === "edit" && (
        <Modal
          title="Potansiyel müşteriyi düzenle"
          onClose={() => setModal(null)}
          width="760px"
        >
          <LeadForm
            lead={lead}
            userId={user?.id ?? ""}
            saving={saving}
            error={error}
            onCancel={() => setModal(null)}
            onSave={(v) => void save(v)}
          />
        </Modal>
      )}
      {modal === "convert" && user && (
        <ConversionModal
          lead={lead}
          companyId={activeCompany!.id}
          userId={user.id}
          onClose={() => setModal(null)}
          onDone={(r) => {
            setResult(r);
            setModal(null);
            void load();
          }}
        />
      )}
    </main>
  );
}
