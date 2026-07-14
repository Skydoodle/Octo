/* eslint-disable react-hooks/set-state-in-effect -- remote quotation state follows company and route context */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Archive, Download, Eye, FilePlus2, Plus } from "lucide-react";
import { useCompanies } from "../../../../company/companyContext";
import { useAuth } from "../../../../auth/authContext";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import {
  listBusinessContacts,
  listBusinessParties,
} from "../../crm/crmRepository";
import type { BusinessContact, BusinessParty } from "../../crm/types";
import {
  getSalesOpportunity,
  listOpportunityContacts,
  listSalesOpportunities,
} from "../../execution/salesExecutionRepository";
import type { SalesOpportunity } from "../../execution/types";
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
} from "../../execution/ui/ExecutionUI";
import {
  archiveSalesQuote,
  createSalesQuote,
  createSalesQuoteRevision,
  getSalesQuote,
  getSalesQuoteVersion,
  listSalesQuoteItems,
  listSalesQuoteStatusHistory,
  listSalesQuoteVersions,
  listSalesQuotes,
  transitionSalesQuoteStatus,
} from "../quoteRepository";
import type {
  QuoteCreateInput,
  SalesQuote,
  SalesQuoteStatus,
  SalesQuoteStatusHistory,
  SalesQuoteVersion,
} from "../types";
import {
  daysUntilQuoteExpiry,
  formatQuoteCurrency,
  isQuoteExpired,
  isQuoteTerminal,
  quoteStatusLabels,
} from "../quoteViewModel";
import QuoteForm from "./QuoteForm";
import { downloadQuotePdf, quotePdfBlob, type QuotePdfData } from "./quotePdf";
import {
  canWriteQuotes,
  emptyQuoteFilters,
  filterQuotes,
  quoteActions,
} from "./quoteUIModel";

async function context(companyId: string) {
  const [p, c, o] = await Promise.all([
    listBusinessParties(companyId),
    listBusinessContacts(companyId),
    listSalesOpportunities(companyId, { includeArchived: false }),
  ]);
  return {
    parties: p.data ?? [],
    contacts: c.data ?? [],
    opportunities: o.data ?? [],
  };
}
async function quoteBundle(companyId: string, quoteId: string) {
  const q = await getSalesQuote(companyId, quoteId);
  if (q.error) return { error: q.error };
  const [v, h] = await Promise.all([
    listSalesQuoteVersions(companyId, quoteId),
    listSalesQuoteStatusHistory(companyId, quoteId),
  ]);
  if (v.error || h.error) return { error: v.error ?? h.error! };
  const itemResults = await Promise.all(
    v.data.map((x) => listSalesQuoteItems(companyId, x.id)),
  );
  return {
    quote: q.data,
    versions: v.data,
    history: h.data,
    items: new Map(v.data.map((x, n) => [x.id, itemResults[n].data ?? []])),
    error: null,
  };
}
function expiry(q: SalesQuote) {
  const days = daysUntilQuoteExpiry(q.validUntil);
  return isQuoteExpired(q)
    ? "Süresi geçti"
    : days != null && days <= 7
      ? `${days} gün kaldı`
      : null;
}

export function QuotesPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const canWrite = canWriteQuotes(activeCompany?.role);
  const [rows, setRows] = useState<SalesQuote[]>([]);
  const [versions, setVersions] = useState(
    new Map<string, SalesQuoteVersion>(),
  );
  const [parties, setParties] = useState<BusinessParty[]>([]);
  const [contacts, setContacts] = useState<BusinessContact[]>([]);
  const [opps, setOpps] = useState<SalesOpportunity[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [f, setF] = useState(emptyQuoteFilters);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [r, ctx] = await Promise.all([
      listSalesQuotes(activeCompany.id, { includeArchived: true }),
      context(activeCompany.id),
    ]);
    if (r.error) return setState("error");
    const vr = await Promise.all(
      r.data
        .filter((q) => q.currentVersionId)
        .map((q) =>
          getSalesQuoteVersion(activeCompany.id, q.currentVersionId!),
        ),
    );
    setRows(r.data);
    setVersions(
      new Map(
        vr.flatMap((x) => (x.data ? [[x.data.id, x.data] as const] : [])),
      ),
    );
    setParties(ctx.parties);
    setContacts(ctx.contacts);
    setOpps(ctx.opportunities);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const partyMap = useMemo(
    () => new Map(parties.map((p) => [p.id, p])),
    [parties],
  );
  const visible = useMemo(
    () => filterQuotes(rows, versions, partyMap, f),
    [rows, versions, partyMap, f],
  );
  const downloadCurrent = async (q: SalesQuote) => {
    const version = q.currentVersionId
      ? versions.get(q.currentVersionId)
      : null;
    const party = partyMap.get(q.partyId);
    if (!version || !party || !activeCompany) return;
    const result = await listSalesQuoteItems(activeCompany.id, version.id);
    if (result.data)
      await downloadQuotePdf({
        seller: { name: activeCompany.name },
        quote: q,
        version,
        items: result.data,
        party,
        contact: contacts.find((c) => c.id === q.contactId) ?? null,
      });
  };
  if (state === "loading")
    return (
      <main className="p-8">
        <PageState kind="loading" message="Teklifler yükleniyor…" />
      </main>
    );
  if (state === "error")
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Teklifler yüklenemedi."
          retry={() => void load()}
        />
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Teklifler</h2>
          <p className="text-sm text-ink-soft">
            Versiyonlu ticari teklifleri ve geçerlilik durumlarını yönetin.
          </p>
        </div>
        {canWrite && (
          <Link className={buttonPrimary} to="yeni">
            <Plus size={15} className="inline" /> Yeni teklif
          </Link>
        )}
      </div>
      <FilterBox>
        <input
          aria-label="Teklif ara"
          className={inputClass}
          placeholder="Teklif numarası veya firma"
          value={f.search}
          onChange={(e) => setF((x) => ({ ...x, search: e.target.value }))}
        />
        <select
          aria-label="Durum"
          className={inputClass}
          value={f.status}
          onChange={(e) => setF((x) => ({ ...x, status: e.target.value }))}
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(quoteStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Firma"
          className={inputClass}
          value={f.party}
          onChange={(e) => setF((x) => ({ ...x, party: e.target.value }))}
        >
          <option value="">Tüm firmalar</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
        <select
          aria-label="Fırsat"
          className={inputClass}
          value={f.opportunity}
          onChange={(e) => setF((x) => ({ ...x, opportunity: e.target.value }))}
        >
          <option value="">Tüm fırsatlar</option>
          {opps.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Sorumlu"
          className={inputClass}
          value={f.owner}
          onChange={(e) => setF((x) => ({ ...x, owner: e.target.value }))}
        >
          <option value="">Tüm sorumlular</option>
          {user && <option value={user.id}>Benim tekliflerim</option>}
        </select>
        <select
          aria-label="Para birimi"
          className={inputClass}
          value={f.currency}
          onChange={(e) => setF((x) => ({ ...x, currency: e.target.value }))}
        >
          <option value="">Tüm para birimleri</option>
          {["TRY", "EUR", "USD", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(
          [
            ["Düzenleme başlangıcı", "issueFrom"],
            ["Düzenleme sonu", "issueTo"],
            ["Geçerlilik başlangıcı", "validFrom"],
            ["Geçerlilik sonu", "validTo"],
          ] as const
        ).map(([l, k]) => (
          <label key={k} className="text-xs">
            {l}
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={f[k]}
              onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
            />
          </label>
        ))}
        <div className="col-span-full flex flex-wrap gap-4 text-sm">
          {(
            [
              ["expiring", "Yakında dolacak"],
              ["expired", "Süresi geçmiş"],
              ["approval", "Onay gerekli"],
              ["archived", "Arşiv"],
            ] as const
          ).map(([k, l]) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={f[k]}
                onChange={(e) => setF((x) => ({ ...x, [k]: e.target.checked }))}
              />{" "}
              {l}
            </label>
          ))}
        </div>
      </FilterBox>
      {!visible.length && (
        <PageState
          kind="empty"
          message={
            rows.length
              ? "Filtrelerle eşleşen teklif bulunamadı."
              : "Henüz teklif bulunmuyor."
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((q) => {
          const v = q.currentVersionId
            ? versions.get(q.currentVersionId)
            : null;
          const party = partyMap.get(q.partyId);
          const contact = contacts.find((c) => c.id === q.contactId);
          const opp = opps.find((o) => o.id === q.opportunityId);
          return (
            <article
              key={q.id}
              className="rounded-card border border-line bg-surface p-5"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <Link className="font-medium hover:text-crimson" to={q.id}>
                    {q.quoteNumber}
                  </Link>
                  <p className="text-sm text-crimson">{party?.displayName}</p>
                  <p className="text-xs text-ink-mute">
                    {contact
                      ? `${contact.firstName} ${contact.lastName ?? ""}`
                      : "Kişi yok"}{" "}
                    · {opp?.title ?? "Fırsat yok"}
                  </p>
                </div>
                <Badge>{quoteStatusLabels[q.status]}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-ink-mute">Versiyon</dt>
                  <dd>v{v?.versionNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Toplam</dt>
                  <dd>
                    {v ? formatQuoteCurrency(v.grandTotal, q.currency) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Düzenleme</dt>
                  <dd>{date(q.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Geçerlilik</dt>
                  <dd>{date(q.validUntil)}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Sorumlu</dt>
                  <dd>{q.ownerUserId === user?.id ? "Siz" : "Ekip üyesi"}</dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Marj</dt>
                  <dd>
                    {v?.grossMargin == null
                      ? "Eksik"
                      : formatQuoteCurrency(v.grossMargin, q.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Onay</dt>
                  <dd>
                    {q.approvalRequired
                      ? q.approvedAt
                        ? "Onaylandı"
                        : "Gerekli"
                      : "Gerekli değil"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-mute">Güncellendi</dt>
                  <dd>{date(q.updatedAt)}</dd>
                </div>
              </dl>
              {expiry(q) && (
                <p className="mt-3 text-sm text-crimson">{expiry(q)}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => void downloadCurrent(q)}
                >
                  <Download size={14} className="inline" /> PDF indir
                </button>
                {canWrite && !q.archivedAt && !isQuoteTerminal(q.status) && (
                  <Link className={buttonSecondary} to={`${q.id}/revizyon`}>
                    Revizyon oluştur
                  </Link>
                )}
                {canWrite && q.status === "draft" && !q.archivedAt && (
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={() =>
                      void archiveSalesQuote(activeCompany!.id, q.id).then(load)
                    }
                  >
                    Arşivle
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!canWrite && (
        <p className="text-xs text-ink-mute">
          Bu görünüm salt okunurdur; müşteri güvenli PDF işlemleri
          kullanılabilir.
        </p>
      )}
    </main>
  );
}

export function QuoteCreatePage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof context>> | null>(
    null,
  );
  const [initial, setInitial] = useState<Partial<QuoteCreateInput>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!activeCompany || !user) return;
    void context(activeCompany.id).then(async (c) => {
      setCtx(c);
      const partyId = params.get("partyId");
      if (partyId)
        setInitial({
          partyId,
          ownerUserId: user.id,
          currency: activeCompany.base_currency as QuoteCreateInput["currency"],
        });
      const id = params.get("opportunityId");
      if (id) {
        const [o, links] = await Promise.all([
          getSalesOpportunity(activeCompany.id, id),
          listOpportunityContacts(activeCompany.id, id),
        ]);
        if (o.data) {
          const primary = links.data?.find((x) => x.isPrimary);
          setInitial({
            partyId: o.data.partyId,
            opportunityId: o.data.id,
            contactId: primary?.contactId ?? null,
            ownerUserId: o.data.ownerUserId,
            currency: o.data.currency,
            items: [
              {
                position: 1,
                description: o.data.productInterest || o.data.title,
                quantity: 1,
                unit: "Hizmet",
                unitPrice: o.data.expectedValue,
                vatRate: 20,
              },
            ],
          });
        }
      }
    });
  }, [activeCompany, user, params]);
  if (!canWriteQuotes(activeCompany?.role))
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Teklif oluşturma yetkiniz bulunmuyor."
        />
      </main>
    );
  if (!ctx || !user)
    return (
      <main className="p-8">
        <PageState kind="loading" message="Teklif formu hazırlanıyor…" />
      </main>
    );
  const save = async (v: QuoteCreateInput) => {
    setSaving(true);
    const r = await createSalesQuote(activeCompany!.id, v);
    setSaving(false);
    if (r.error) return setError(r.error.message);
    navigate(`/dashboard/satis/teklifler/${r.data.quoteId}`, {
      state: { notice: "Teklif başarıyla oluşturuldu." },
    });
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <h1 className="font-serif text-3xl">Yeni Teklif</h1>
      <QuoteForm
        key={JSON.stringify(initial)}
        initial={initial}
        parties={ctx.parties}
        contacts={ctx.contacts}
        opportunities={ctx.opportunities}
        userId={user.id}
        saving={saving}
        error={error}
        onSave={(v) => void save(v)}
      />
    </main>
  );
}

function PdfPreview({
  data,
  onClose,
}: {
  data: QuotePdfData;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void quotePdfBlob(data).then((b) => {
      if (active) {
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      }
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data]);
  return (
    <Modal title="Teklif PDF önizleme" onClose={onClose} width="900px">
      {url ? (
        <iframe
          title="Teklif PDF önizleme"
          src={url}
          className="h-[70vh] w-full"
        />
      ) : (
        <PageState kind="loading" message="PDF hazırlanıyor…" />
      )}
    </Modal>
  );
}

export function QuoteDetailPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const { quoteId = "" } = useParams();
  const location = useLocation();
  const canWrite = canWriteQuotes(activeCompany?.role);
  const [view, setView] = useState<Awaited<
    ReturnType<typeof quoteBundle>
  > | null>(null);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof context>> | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<SalesQuoteStatus | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState(false);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [b, c] = await Promise.all([
      quoteBundle(activeCompany.id, quoteId),
      context(activeCompany.id),
    ]);
    setView(b);
    setCtx(c);
  }, [activeCompany, quoteId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!view || !ctx)
    return (
      <main className="p-8">
        <PageState kind="loading" message="Teklif yükleniyor…" />
      </main>
    );
  if (view.error || !("quote" in view))
    return (
      <main className="p-8">
        <PageState kind="error" message="Teklif bulunamadı veya yüklenemedi." />
      </main>
    );
  const q = view.quote;
  const current = view.versions.find((v) => v.id === q.currentVersionId)!;
  const shown =
    view.versions.find((v) => v.id === (selected ?? q.currentVersionId)) ??
    current;
  const items = view.items.get(shown.id) ?? [];
  const party = ctx.parties.find((p) => p.id === q.partyId)!;
  const contact = ctx.contacts.find((c) => c.id === q.contactId) ?? null;
  const opp = ctx.opportunities.find((o) => o.id === q.opportunityId);
  const data = {
    seller: { name: activeCompany!.name },
    quote: q,
    version: shown,
    items,
    party,
    contact,
  };
  const actions = quoteActions(
    q.status,
    q.approvalRequired,
    !!q.approvedAt,
    activeCompany?.role === "owner",
  );
  const transition = async () => {
    if (!action) return;
    if (action === "accepted" && !evidence.trim() && !reason.trim())
      return setError("Kabul kanıtı veya gerekçe zorunludur.");
    if (action === "rejected" && !reason.trim())
      return setError("Ret gerekçesi zorunludur.");
    if (action === "cancelled" && !reason.trim())
      return setError("İptal gerekçesi zorunludur.");
    const r = await transitionSalesQuoteStatus(activeCompany!.id, {
      quoteId: q.id,
      destinationStatus: action,
      reason: reason || null,
      evidence: evidence || null,
    });
    if (r.error) return setError(r.error.message);
    setAction(null);
    setReason("");
    setEvidence("");
    setNotice(
      action === "accepted"
        ? "Teklif kabul edildi. Satış siparişi dönüşümü henüz kullanıma açık değildir."
        : "Teklif durumu güncellendi.",
    );
    await load();
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <header className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">{q.quoteNumber}</h1>
            <p className="text-crimson">{party.displayName}</p>
            <div className="mt-2 flex gap-2">
              <Badge>{quoteStatusLabels[q.status]}</Badge>
              <Badge muted>v{current.versionNumber}</Badge>
              {q.archivedAt && <Badge muted>Arşiv</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setPdf(true)}
            >
              <Eye size={15} className="inline" /> PDF önizle
            </button>
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => void downloadQuotePdf(data)}
            >
              <Download size={15} className="inline" /> PDF indir
            </button>
            {canWrite && !isQuoteTerminal(q.status) && !q.archivedAt && (
              <Link className={buttonSecondary} to="revizyon">
                <FilePlus2 size={15} className="inline" /> Revizyon oluştur
              </Link>
            )}
            {canWrite && q.status === "draft" && !q.archivedAt && (
              <button
                type="button"
                className={buttonSecondary}
                onClick={() =>
                  void archiveSalesQuote(activeCompany!.id, q.id).then(load)
                }
              >
                <Archive size={15} className="inline" /> Arşivle
              </button>
            )}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Toplam", formatQuoteCurrency(current.grandTotal, q.currency)],
            ["Düzenleme", date(q.issueDate)],
            ["Geçerlilik", date(q.validUntil)],
            ["Sorumlu", q.ownerUserId === user?.id ? "Siz" : "Ekip üyesi"],
            [
              "İlgili kişi",
              contact ? `${contact.firstName} ${contact.lastName ?? ""}` : "—",
            ],
            ["Fırsat", opp?.title ?? "—"],
            [
              "Onay",
              q.approvalRequired
                ? q.approvedAt
                  ? "Onaylandı"
                  : "Bekleniyor"
                : "Gerekli değil",
            ],
            ["Geçerlilik uyarısı", expiry(q) ?? "—"],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="text-xs text-ink-mute">{l}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      {canWrite && actions.length > 0 && (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-serif text-xl">Durum İşlemleri</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((s) => (
              <button
                type="button"
                key={s}
                className={buttonSecondary}
                onClick={() => setAction(s)}
              >
                {s === "pending_approval"
                  ? "Onaya gönder"
                  : s === "draft"
                    ? "Taslağa geri al"
                    : s === "sent" && q.status === "pending_approval"
                      ? "Onayla ve gönderildi işaretle"
                      : quoteStatusLabels[s]}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-serif text-xl">Firma ve Ticari Bağlam</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            ["Firma", party.displayName],
            [
              "İlgili kişi",
              contact ? `${contact.firstName} ${contact.lastName ?? ""}` : "—",
            ],
            ["Fırsat", opp?.title ?? "—"],
            ["Ödeme koşulları", q.paymentTerms ?? "—"],
            ["Teslimat koşulları", q.deliveryTerms ?? "—"],
            ["Beklenen teslimat", date(q.expectedDeliveryDate)],
            ["Müşteri notu", q.customerNotes ?? "—"],
            ["İç not", q.internalNotes ?? "—"],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="text-xs text-ink-mute">{l}</dt>
              <dd className="whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex justify-between">
          <h2 className="font-serif text-xl">
            Kalemler · v{shown.versionNumber}
          </h2>
          {!shown.isCurrent && <Badge muted>Tarihsel · salt okunur</Badge>}
        </div>
        <div className="mt-4 space-y-2">
          {items.map((i) => (
            <article
              key={i.id}
              className="grid gap-2 rounded-lg border border-line p-3 text-sm md:grid-cols-6"
            >
              <strong>
                {i.position}. {i.description}
              </strong>
              <span>
                {i.quantity} {i.unit}
              </span>
              <span>{formatQuoteCurrency(i.unitPrice, q.currency)}</span>
              <span>İndirim: {i.lineDiscount}</span>
              <span>KDV: %{i.vatRate}</span>
              <span>{formatQuoteCurrency(i.lineTotal, q.currency)}</span>
              {i.unitCost != null && (
                <span>
                  Maliyet: {formatQuoteCurrency(i.lineCost!, q.currency)}
                </span>
              )}
              {i.lineMargin != null && (
                <span>
                  Marj: {formatQuoteCurrency(i.lineMargin, q.currency)}
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-serif text-xl">Toplamlar</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Ara toplam", shown.subtotal],
            ["İndirim", shown.discountTotal],
            ["KDV", shown.taxTotal],
            ["Diğer vergi", shown.otherTaxTotal],
            ["Genel toplam", shown.grandTotal],
            ["Toplam maliyet", shown.totalCost],
            ["Brüt marj", shown.grossMargin],
            ["Marj %", shown.grossMarginPct],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs text-ink-mute">{l}</dt>
              <dd>
                {v == null
                  ? "—"
                  : l === "Marj %"
                    ? `%${v}`
                    : formatQuoteCurrency(v as number, q.currency)}
              </dd>
            </div>
          ))}
        </dl>
        {shown.totalCost == null && (
          <p className="mt-4 text-sm text-crimson">
            Maliyet verisi eksik olduğu için toplam marj hesaplanmadı.
          </p>
        )}
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-serif text-xl">Versiyon Geçmişi</h2>
          {view.versions.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => setSelected(v.id)}
              className="mt-3 flex w-full justify-between border-b border-line pb-2 text-left"
            >
              <span>
                v{v.versionNumber} · {date(v.createdAt)}
                <br />
                <small>
                  {v.revisionNote ?? "İlk versiyon"} · Oluşturan ekip üyesi
                </small>
              </span>
              <span>
                {formatQuoteCurrency(v.grandTotal, q.currency)}{" "}
                {v.isCurrent && <Badge>Güncel</Badge>}
              </span>
            </button>
          ))}
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-serif text-xl">Durum Geçmişi</h2>
          {view.history.map((h: SalesQuoteStatusHistory) => (
            <div key={h.id} className="mt-3 border-b border-line pb-2 text-sm">
              {h.fromStatus ? quoteStatusLabels[h.fromStatus] : "Başlangıç"} →{" "}
              {quoteStatusLabels[h.toStatus]} · {datetime(h.changedAt)}
              <br />
              <small>
                {h.reason ?? "Neden belirtilmedi"}{" "}
                {h.evidence && "· Kanıt kaydedildi"} · Ekip üyesi
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-serif text-xl">Onay</h2>
        <p>
          {q.approvalRequired ? "Onay gerekli" : "Onay gerekli değil"} ·{" "}
          {q.approvalReason ?? "Neden belirtilmedi"} ·{" "}
          {q.approvedAt
            ? `Owner tarafından ${datetime(q.approvedAt)} tarihinde onaylandı`
            : "Henüz onaylanmadı"}
        </p>
        <p className="mt-2 text-xs text-ink-mute">
          V1’de yalnız aktif owner onaylayabilir; yapılandırılabilir onay
          kuralları yoktur.
        </p>
      </section>
      {action && (
        <Modal
          title={`${quoteStatusLabels[action]} işlemini onayla`}
          onClose={() => setAction(null)}
        >
          <div className="space-y-4">
            {action === "accepted" && (
              <label className="block text-sm">
                Kabul kanıtı
                <textarea
                  className={`${inputClass} mt-1`}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm">
              Neden {["rejected", "cancelled"].includes(action) && "(zorunlu)"}
              <textarea
                className={`${inputClass} mt-1`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => void transition()}
            >
              İşlemi onayla
            </button>
          </div>
        </Modal>
      )}
      {pdf && <PdfPreview data={data} onClose={() => setPdf(false)} />}
    </main>
  );
}

export function QuoteRevisionPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const { quoteId = "" } = useParams();
  const navigate = useNavigate();
  const [b, setB] = useState<Awaited<ReturnType<typeof quoteBundle>> | null>(
    null,
  );
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof context>> | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!activeCompany) return;
    void Promise.all([
      quoteBundle(activeCompany.id, quoteId),
      context(activeCompany.id),
    ]).then(([x, c]) => {
      setB(x);
      setCtx(c);
    });
  }, [activeCompany, quoteId]);
  if (!canWriteQuotes(activeCompany?.role))
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Teklif revizyonu oluşturma yetkiniz bulunmuyor."
        />
      </main>
    );
  if (!b || !ctx || !user)
    return (
      <main className="p-8">
        <PageState kind="loading" message="Revizyon hazırlanıyor…" />
      </main>
    );
  if (
    b.error ||
    !("quote" in b) ||
    b.quote.archivedAt ||
    isQuoteTerminal(b.quote.status)
  )
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Bu teklif için revizyon oluşturulamaz."
        />
      </main>
    );
  const q = b.quote;
  const current = b.versions.find((v) => v.id === q.currentVersionId)!;
  const items = (b.items.get(current.id) ?? []).map((i) => ({
    position: i.position,
    itemCode: i.itemCode,
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    unitPrice: i.unitPrice,
    discountType: i.discountType,
    discountValue: i.discountValue,
    vatRate: i.vatRate,
    otherTaxRate: i.otherTaxRate,
    unitCost: i.unitCost,
  }));
  const initial = {
    partyId: q.partyId,
    contactId: q.contactId,
    opportunityId: q.opportunityId,
    ownerUserId: q.ownerUserId,
    currency: q.currency,
    issueDate: q.issueDate,
    validUntil: q.validUntil,
    paymentTerms: q.paymentTerms,
    deliveryTerms: q.deliveryTerms,
    expectedDeliveryDate: q.expectedDeliveryDate,
    customerNotes: q.customerNotes,
    internalNotes: q.internalNotes,
    items,
  };
  const save = async (v: QuoteCreateInput) => {
    if (!note.trim()) return setError("Revizyon notu gereklidir.");
    setSaving(true);
    const r = await createSalesQuoteRevision(activeCompany!.id, {
      quoteId: q.id,
      revisionNote: note,
      items: v.items,
      validUntil: v.validUntil,
      paymentTerms: v.paymentTerms,
      deliveryTerms: v.deliveryTerms,
      expectedDeliveryDate: v.expectedDeliveryDate,
      customerNotes: v.customerNotes,
      internalNotes: v.internalNotes,
    });
    setSaving(false);
    if (r.error) return setError(r.error.message);
    navigate(`/dashboard/satis/teklifler/${q.id}`, {
      state: { notice: "Yeni teklif versiyonu oluşturuldu." },
    });
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <h1 className="font-serif text-3xl">
        Teklif Revizyonu · {q.quoteNumber}
      </h1>
      <p className="text-sm text-ink-soft">
        Mevcut v{current.versionNumber} toplamı:{" "}
        {formatQuoteCurrency(current.grandTotal, q.currency)}. Yeni toplam onay
        özetinde karşılaştırılacaktır.
      </p>
      <label className="block text-sm">
        Revizyon notu
        <input
          required
          className={`${inputClass} mt-1`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <QuoteForm
        initial={initial}
        parties={ctx.parties}
        contacts={ctx.contacts}
        opportunities={ctx.opportunities}
        userId={user.id}
        revisionNote={note}
        saving={saving}
        error={error}
        submitLabel="Revizyonu oluştur"
        onSave={(v) => void save(v)}
      />
    </main>
  );
}
