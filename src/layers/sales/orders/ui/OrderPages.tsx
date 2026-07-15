/* eslint-disable react-hooks/set-state-in-effect -- remote order state follows company and route context */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, ArrowLeft, PackageCheck } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../../auth/authContext";
import { useCompanies } from "../../../../company/companyContext";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import { listBusinessContacts, listBusinessParties } from "../../crm/crmRepository";
import { listSalesOpportunities } from "../../execution/salesExecutionRepository";
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
import { getSalesQuoteVersion, listSalesQuotes } from "../../quotes/quoteRepository";
import {
  archiveSalesOrder,
  recordSalesOrderFulfillment,
  transitionSalesOrderStatus,
} from "../salesOrderRepository";
import {
  formatOrderCurrency,
  isDeliveryOverdue,
  mayArchiveSalesOrder,
  mayRecordFulfillment,
  remainingQuantity,
  salesOrderStatusLabels,
} from "../salesOrderViewModel";
import type {
  RecordFulfillmentInput,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from "../types";
import { loadOrderDetail, loadOrdersWithProgress } from "./orderUIData";
import SalesOrderInvoicePanel from "../../../finance/ui/SalesOrderInvoicePanel";
import {
  canWriteOrders,
  emptyOrderFilters,
  explicitOrderActions,
  filterOrders,
  type OrderProgress,
} from "./orderUIModel";

async function context(companyId: string) {
  const [parties, contacts, opportunities, quotes] = await Promise.all([
    listBusinessParties(companyId, { includeArchived: true }),
    listBusinessContacts(companyId, undefined, { includeArchived: true }),
    listSalesOpportunities(companyId, { includeArchived: true }),
    listSalesQuotes(companyId, { includeArchived: true }),
  ]);
  return {
    parties: parties.data ?? [],
    contacts: contacts.data ?? [],
    opportunities: opportunities.data ?? [],
    quotes: quotes.data ?? [],
  };
}
type OrderBundle = NonNullable<
  Awaited<ReturnType<typeof loadOrdersWithProgress>>["data"]
>[number];

export function SalesOrdersPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const canWrite = canWriteOrders(activeCompany?.role);
  const [rows, setRows] = useState<OrderBundle[]>([]);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof context>> | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [filters, setFilters] = useState(emptyOrderFilters);
  const [archiveTarget, setArchiveTarget] = useState<SalesOrder | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [orders, orderContext] = await Promise.all([
      loadOrdersWithProgress(activeCompany.id, { includeArchived: true }),
      context(activeCompany.id),
    ]);
    if (orders.error) return setState("error");
    setRows(orders.data);
    setCtx(orderContext);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const partyMap = useMemo(
    () => new Map((ctx?.parties ?? []).map((party) => [party.id, party])),
    [ctx],
  );
  const progressMap = useMemo(
    () => new Map(rows.map((bundle) => [bundle.order.id, bundle.progress])),
    [rows],
  );
  const visible = useMemo(
    () => filterOrders(rows.map((row) => row.order), progressMap, partyMap, filters),
    [rows, progressMap, partyMap, filters],
  );
  if (state === "loading")
    return <main className="p-8"><PageState kind="loading" message="Satış siparişleri yükleniyor…" /></main>;
  if (state === "error" || !ctx)
    return <main className="p-8"><PageState kind="error" message="Satış siparişleri yüklenemedi." retry={() => void load()} /></main>;
  const archive = async () => {
    if (!archiveTarget || !activeCompany) return;
    const result = await archiveSalesOrder(activeCompany.id, archiveTarget.id);
    if (result.error) return setError(result.error.message);
    setArchiveTarget(null);
    setNotice("Satış siparişi arşivlendi.");
    await load();
  };
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <div>
        <h2 className="font-serif text-2xl">Satış Siparişleri</h2>
        <p className="text-sm text-ink-soft">Kabul edilmiş tekliflerden oluşan siparişleri ve karşılanma durumlarını izleyin.</p>
      </div>
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <FilterBox>
        <input aria-label="Sipariş ara" className={inputClass} placeholder="Sipariş numarası veya firma" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        <select aria-label="Durum" className={inputClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">Tüm durumlar</option>
          {Object.entries(salesOrderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Firma" className={inputClass} value={filters.party} onChange={(event) => setFilters((current) => ({ ...current, party: event.target.value }))}>
          <option value="">Tüm firmalar</option>
          {ctx.parties.map((party) => <option key={party.id} value={party.id}>{party.displayName}</option>)}
        </select>
        <select aria-label="Sorumlu" className={inputClass} value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}>
          <option value="">Tüm sorumlular</option>{user && <option value={user.id}>Benim siparişlerim</option>}
        </select>
        <select aria-label="Para birimi" className={inputClass} value={filters.currency} onChange={(event) => setFilters((current) => ({ ...current, currency: event.target.value }))}>
          <option value="">Tüm para birimleri</option>{["TRY", "EUR", "USD", "GBP"].map((currency) => <option key={currency}>{currency}</option>)}
        </select>
        <select aria-label="Karşılama durumu" className={inputClass} value={filters.fulfillment} onChange={(event) => setFilters((current) => ({ ...current, fulfillment: event.target.value }))}>
          <option value="">Tüm karşılanma durumları</option><option value="unfulfilled">Karşılanmadı</option><option value="partially_fulfilled">Kısmen karşılandı</option><option value="fully_fulfilled">Tamamen karşılandı</option>
        </select>
        {([['Sipariş başlangıcı','orderFrom'],['Sipariş sonu','orderTo'],['Teslimat başlangıcı','deliveryFrom'],['Teslimat sonu','deliveryTo']] as const).map(([label, key]) => <label key={key} className="text-xs">{label}<input type="date" className={`${inputClass} mt-1`} value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
        <div className="col-span-full flex flex-wrap gap-4 text-sm">
          <label><input type="checkbox" checked={filters.overdue} onChange={(event) => setFilters((current) => ({ ...current, overdue: event.target.checked }))} /> Geciken teslimatlar</label>
          <label><input type="checkbox" checked={filters.archived} onChange={(event) => setFilters((current) => ({ ...current, archived: event.target.checked }))} /> Arşiv</label>
          <button type="button" className="text-crimson" onClick={() => setFilters(emptyOrderFilters)}>Filtreleri temizle</button>
        </div>
      </FilterBox>
      {!visible.length && <PageState kind="empty" message={rows.length ? "Filtrelerle eşleşen satış siparişi bulunamadı." : "Henüz satış siparişi bulunmuyor. Siparişler yalnız kabul edilmiş tekliflerden oluşturulur."} />}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((order) => {
          const bundle = rows.find((row) => row.order.id === order.id)!;
          const party = partyMap.get(order.partyId);
          const contact = ctx.contacts.find((value) => value.id === order.contactId);
          const quote = ctx.quotes.find((value) => value.id === order.sourceQuoteId);
          const opportunity = ctx.opportunities.find((value) => value.id === order.opportunityId);
          return <article key={order.id} className="rounded-card border border-line bg-surface p-5">
            <div className="flex justify-between gap-3"><div><Link className="font-medium hover:text-crimson" to={order.id}>{order.orderNumber}</Link><p className="text-sm text-crimson">{party?.displayName}</p><p className="text-xs text-ink-mute">{contact ? `${contact.firstName} ${contact.lastName ?? ''}` : 'Kişi yok'} · {opportunity?.title ?? 'Fırsat yok'}</p></div><Badge>{salesOrderStatusLabels[order.status]}</Badge></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Kaynak teklif" value={quote?.quoteNumber ?? '—'} /><Info label="Sorumlu" value={order.ownerUserId === user?.id ? 'Siz' : 'Ekip üyesi'} /><Info label="Sipariş tarihi" value={date(order.orderDate)} /><Info label="Beklenen teslimat" value={date(order.expectedDeliveryDate)} /><Info label="Toplam" value={formatOrderCurrency(order.grandTotal, order.currency)} /><Info label="Karşılama" value={`%${Math.round(bundle.progress.percentage)}`} /><Info label="Kalan" value={`${bundle.progress.remainingItems} kalem · ${bundle.progress.remaining} toplam birim`} /><Info label="Güncellendi" value={date(order.updatedAt)} />
            </dl>
            {isDeliveryOverdue(order) && <p className="mt-3 text-sm text-crimson">Beklenen teslimat tarihi geçti.</p>}
            <div className="mt-4 flex flex-wrap gap-2"><Link className={buttonSecondary} to={order.id}>Detayı aç</Link><Link className={buttonSecondary} to={`/dashboard/satis/teklifler/${order.sourceQuoteId}`}>Kaynak teklifi aç</Link>{canWrite && mayArchiveSalesOrder(order, bundle.fulfillments.length) && <button type="button" className={buttonSecondary} onClick={() => setArchiveTarget(order)}><Archive size={14} className="inline" /> Arşivle</button>}</div>
          </article>;
        })}
      </div>
      {!canWrite && <p className="text-xs text-ink-mute">Bu görünüm salt okunurdur.</p>}
      {archiveTarget && <Modal title="Satış siparişini arşivle" onClose={() => setArchiveTarget(null)}><p className="text-sm text-ink-soft">Bu taslak satış siparişi arşivlenecek. Ticari snapshot korunacaktır.</p><div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonSecondary} onClick={() => setArchiveTarget(null)}>Vazgeç</button><button type="button" className={buttonPrimary} onClick={() => void archive()}>Arşivle</button></div></Modal>}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-ink-mute">{label}</dt><dd>{value}</dd></div>;
}

function FulfillmentForm({
  order,
  items,
  progress,
  saving,
  serverError,
  onCancel,
  onSave,
}: {
  order: SalesOrder;
  items: SalesOrderItem[];
  progress: OrderProgress;
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSave: (input: RecordFulfillmentInput) => void;
}) {
  const available = items.filter((item) => remainingQuantity(item.orderedQuantity, progress.byItem.get(item.id) ?? 0) > 0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [fulfilledAt, setFulfilledAt] = useState(new Date().toISOString().slice(0, 16));
  const [deliveryReference, setDeliveryReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selected = available.flatMap((item) => (quantities[item.id] > 0 ? [{ item, amount: quantities[item.id] }] : []));
  const newAmount = selected.reduce((sum, entry) => sum + entry.amount, 0);
  const expectedPercentage = progress.ordered ? Math.min(100, ((progress.fulfilled + newAmount) / progress.ordered) * 100) : 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected.length) return setError("En az bir pozitif miktar girilmelidir.");
    if (selected.some(({ item, amount }) => amount > remainingQuantity(item.orderedQuantity, progress.byItem.get(item.id) ?? 0))) return setError("Karşılanan miktar kalan miktarı aşamaz.");
    onSave({ salesOrderId: order.id, fulfilledAt: new Date(fulfilledAt).toISOString(), deliveryReference, note, items: selected.map(({ item, amount }) => ({ salesOrderItemId: item.id, fulfilledQuantity: amount })) });
  };
  return <form onSubmit={submit} className="space-y-5">
    {(error || serverError) && <p role="alert" className="text-sm text-crimson">{error || serverError}</p>}
    <div className="space-y-3">{available.map((item) => { const fulfilled = progress.byItem.get(item.id) ?? 0; const remaining = remainingQuantity(item.orderedQuantity, fulfilled); return <article key={item.id} className="rounded-lg border border-line p-3"><strong>{item.description}</strong><p className="text-xs text-ink-mute">Sipariş {item.orderedQuantity} · Önceki {fulfilled} · Kalan {remaining} {item.unit}</p><label className="mt-2 block text-sm">Karşılanacak miktar<input aria-describedby={`remaining-${item.id}`} type="number" min="0" max={remaining} step="any" className={`${inputClass} mt-1`} value={quantities[item.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /></label><span id={`remaining-${item.id}`} className="sr-only">En fazla {remaining} {item.unit}</span></article>; })}</div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Karşılama tarihi ve saati<input required type="datetime-local" className={`${inputClass} mt-1`} value={fulfilledAt} onChange={(event) => setFulfilledAt(event.target.value)} /></label><label className="text-sm">Teslimat referansı<input className={`${inputClass} mt-1`} value={deliveryReference} onChange={(event) => setDeliveryReference(event.target.value)} /></label></div>
    <label className="block text-sm">Not<textarea className={`${inputClass} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <section role="status" className="rounded-lg bg-crimson/5 p-3 text-sm"><strong>Onay özeti</strong><p>{selected.length} kalem · {selected.map(({ item, amount }) => `${item.description}: ${amount} ${item.unit}`).join(' · ') || 'Miktar seçilmedi'}</p><p>Beklenen karşılama: %{Math.round(expectedPercentage)} · {expectedPercentage >= 100 ? 'Siparişi tamamlıyor gibi görünüyor' : 'Kısmi karşılama'}. Sonuç durumu Supabase belirler.</p></section>
    <div className="flex justify-end gap-2"><button type="button" className={buttonSecondary} onClick={onCancel}>Vazgeç</button><button type="submit" className={buttonPrimary} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Karşılamayı kaydet'}</button></div>
  </form>;
}

export function SalesOrderDetailPage() {
  const { activeCompany } = useCompanies();
  const { user } = useAuth();
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canWrite = canWriteOrders(activeCompany?.role);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof loadOrderDetail>>["data"] | null>(null);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof context>> | null>(null);
  const [sourceVersion, setSourceVersion] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [modal, setModal] = useState<null | "cancel" | "archive" | "fulfillment">(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [order, orderContext] = await Promise.all([loadOrderDetail(activeCompany.id, orderId), context(activeCompany.id)]);
    if (order.error || !order.data) return setState(order.error?.code === "not_found" ? "notfound" : "error");
    const version = await getSalesQuoteVersion(activeCompany.id, order.data.order.sourceQuoteVersionId);
    setBundle(order.data); setCtx(orderContext); setSourceVersion(version.data?.versionNumber ?? null); setState("ready");
  }, [activeCompany, orderId]);
  useEffect(() => { void load(); }, [load]);
  if (state === "loading") return <main className="p-8"><PageState kind="loading" message="Satış siparişi yükleniyor…" /></main>;
  if (state !== "ready" || !bundle || !ctx) return <main className="p-8"><PageState kind={state === "notfound" ? "empty" : "error"} message={state === "notfound" ? "Satış siparişi bulunamadı veya bu şirkette görüntülenemiyor." : "Satış siparişi yüklenemedi."} /></main>;
  const { order, items, fulfillments, fulfillmentItems, progress, history } = bundle;
  const party = ctx.parties.find((value) => value.id === order.partyId);
  const contact = ctx.contacts.find((value) => value.id === order.contactId);
  const opportunity = ctx.opportunities.find((value) => value.id === order.opportunityId);
  const quote = ctx.quotes.find((value) => value.id === order.sourceQuoteId);
  const actions = explicitOrderActions(order.status);
  const transition = async (destinationStatus: SalesOrderStatus, transitionReason?: string) => {
    if (destinationStatus === "cancelled" && !transitionReason?.trim()) return setError("İptal nedeni gereklidir.");
    setSaving(true); const result = await transitionSalesOrderStatus(activeCompany!.id, { salesOrderId: order.id, destinationStatus, reason: transitionReason }); setSaving(false);
    if (result.error) return setError(result.error.message);
    setModal(null); setReason(""); setNotice(destinationStatus === "confirmed" ? "Satış siparişi onaylandı." : destinationStatus === "in_preparation" ? "Sipariş hazırlamaya alındı." : "Satış siparişi iptal edildi."); await load();
  };
  const recordFulfillment = async (input: RecordFulfillmentInput) => {
    setSaving(true); const result = await recordSalesOrderFulfillment(activeCompany!.id, input); setSaving(false);
    if (result.error) return setError(result.error.message);
    setModal(null); setNotice(result.data.resultingStatus === "completed" ? "Sipariş tamamen karşılandı ve tamamlandı." : `Karşılama kaydı başarıyla oluşturuldu. Sonuç: ${salesOrderStatusLabels[result.data.resultingStatus]}.`); await load();
  };
  const archive = async () => { setSaving(true); const result = await archiveSalesOrder(activeCompany!.id, order.id); setSaving(false); if (result.error) return setError(result.error.message); navigate("/dashboard/satis/satis-siparisleri", { state: { notice: "Satış siparişi arşivlendi." } }); };
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
    <Link to="/dashboard/satis/satis-siparisleri" className="text-sm text-crimson"><ArrowLeft size={15} className="inline" /> Satış siparişlerine dön</Link>
    {notice && <Notice>{notice}</Notice>}{error && <Notice error>{error}</Notice>}
    <header className="rounded-card border border-line bg-surface p-6"><div className="flex flex-wrap justify-between gap-4"><div><h1 className="font-serif text-3xl">{order.orderNumber}</h1><p className="text-crimson">{party?.displayName}</p><div className="mt-2 flex gap-2"><Badge>{salesOrderStatusLabels[order.status]}</Badge>{order.archivedAt && <Badge muted>Arşiv</Badge>}</div></div>{canWrite && !order.archivedAt && <div className="flex flex-wrap gap-2">{actions.includes("confirmed") && <button type="button" className={buttonPrimary} onClick={() => void transition("confirmed")}>Siparişi onayla</button>}{actions.includes("in_preparation") && <button type="button" className={buttonPrimary} onClick={() => void transition("in_preparation")}>Hazırlamaya başla</button>}{mayRecordFulfillment(order) && <button type="button" className={buttonPrimary} onClick={() => { setError(null); setModal("fulfillment"); }}><PackageCheck size={15} className="inline" /> Karşılama kaydet</button>}{actions.includes("cancelled") && <button type="button" className={buttonSecondary} onClick={() => { setError(null); setModal("cancel"); }}>İptal et</button>}{mayArchiveSalesOrder(order, fulfillments.length) && <button type="button" className={buttonSecondary} onClick={() => setModal("archive")}>Arşivle</button>}</div>}</div><dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Info label="Toplam" value={formatOrderCurrency(order.grandTotal, order.currency)} /><Info label="Sipariş tarihi" value={date(order.orderDate)} /><Info label="Beklenen teslimat" value={date(order.expectedDeliveryDate)} /><Info label="Sorumlu" value={order.ownerUserId === user?.id ? 'Siz' : 'Ekip üyesi'} /><Info label="Karşılama" value={`%${Math.round(progress.percentage)}`} /><Info label="Kalan" value={`${progress.remainingItems} kalem · ${progress.remaining} toplam birim`} /></dl>{isDeliveryOverdue(order) && <p className="mt-4 text-sm text-crimson">Beklenen teslimat tarihi geçti.</p>}</header>
    <section className="rounded-card border border-line bg-surface p-5"><h2 className="font-serif text-xl">Ticari Bağlam</h2><p className="mt-2 rounded-lg bg-crimson/5 p-3 text-sm">Bu sipariş, kabul edilen teklifin değiştirilemez ticari kopyasıdır.</p><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["Kaynak teklif", `${quote?.quoteNumber ?? '—'} · v${sourceVersion ?? '—'}`],["Firma",party?.displayName ?? '—'],["İlgili kişi",contact ? `${contact.firstName} ${contact.lastName ?? ''}` : '—'],["Fırsat",opportunity?.title ?? '—'],["Sorumlu",order.ownerUserId === user?.id ? 'Siz' : 'Ekip üyesi'],["Ödeme koşulları",order.paymentTerms ?? '—'],["Teslimat koşulları",order.deliveryTerms ?? '—'],["Müşteri notu",order.customerNotes ?? '—'],["İç not",order.internalNotes ?? '—'],["Oluşturuldu",datetime(order.createdAt)],["Güncellendi",datetime(order.updatedAt)]].map(([label,value]) => <Info key={label} label={label} value={value} />)}</dl><div className="mt-4 flex flex-wrap gap-2"><Link className={buttonSecondary} to={`/dashboard/satis/teklifler/${order.sourceQuoteId}`}>Kaynak teklif</Link><Link className={buttonSecondary} to={`/dashboard/satis/firmalar/${order.partyId}`}>Firma</Link>{order.opportunityId && <Link className={buttonSecondary} to={`/dashboard/satis/firsatlar/${order.opportunityId}`}>Fırsat</Link>}</div></section>
    <section className="rounded-card border border-line bg-surface p-5"><h2 className="font-serif text-xl">Sipariş Kalemleri</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{items.map((item) => { const fulfilled = progress.byItem.get(item.id) ?? 0; const remaining = remainingQuantity(item.orderedQuantity, fulfilled); const percentage = item.orderedQuantity ? Math.min(100, fulfilled / item.orderedQuantity * 100) : 0; return <article key={item.id} className="rounded-lg border border-line p-4"><strong>{item.position}. {item.description}</strong><p className="text-xs text-ink-mute">{item.itemCode || 'Kod yok'}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><Info label="Sipariş" value={`${item.orderedQuantity} ${item.unit}`} /><Info label="Karşılanan" value={`${fulfilled} ${item.unit}`} /><Info label="Kalan" value={`${remaining} ${item.unit}`} /><Info label="Karşılama" value={`%${Math.round(percentage)}`} /><Info label="Birim fiyat" value={formatOrderCurrency(item.unitPrice, order.currency)} /><Info label="İndirim" value={item.discountType ? `${item.discountValue}${item.discountType === 'percentage' ? '%' : ''}` : '—'} /><Info label="KDV" value={`%${item.vatRate}`} /><Info label="Diğer vergi" value={`%${item.otherTaxRate}`} /><Info label="Satır toplamı" value={formatOrderCurrency(item.lineTotal, order.currency)} />{item.unitCost != null && <Info label="Birim maliyet" value={formatOrderCurrency(item.unitCost, order.currency)} />}{item.lineMargin != null && <Info label="Marj" value={formatOrderCurrency(item.lineMargin, order.currency)} />}</dl></article>; })}</div></section>
    <section className="rounded-card border border-line bg-surface p-5"><h2 className="font-serif text-xl">Toplamlar</h2><dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Info label="Ara toplam" value={formatOrderCurrency(order.subtotal, order.currency)} /><Info label="İndirim" value={formatOrderCurrency(order.discountTotal, order.currency)} /><Info label="Vergi" value={formatOrderCurrency(order.taxTotal, order.currency)} /><Info label="Diğer vergi" value={formatOrderCurrency(order.otherTaxTotal, order.currency)} /><Info label="Genel toplam" value={formatOrderCurrency(order.grandTotal, order.currency)} />{order.totalCost != null && <Info label="Toplam maliyet" value={formatOrderCurrency(order.totalCost, order.currency)} />}{order.grossMargin != null && <Info label="Brüt marj" value={formatOrderCurrency(order.grossMargin, order.currency)} />}{order.grossMarginPct != null && <Info label="Marj %" value={`%${order.grossMarginPct}`} />}</dl>{order.totalCost == null && <p className="mt-3 text-sm text-ink-mute">Maliyet verisi eksik olduğu için toplam marj hesaplanmadı.</p>}</section>
    <section className="rounded-card border border-line bg-surface p-5"><h2 className="font-serif text-xl">Karşılama Geçmişi</h2>{!fulfillments.length ? <p className="mt-3 text-sm text-ink-soft">Henüz karşılama kaydı yok.</p> : <div className="mt-4 space-y-3">{fulfillments.map((fulfillment) => <article key={fulfillment.id} className="rounded-lg border border-line p-4"><strong>Karşılama #{fulfillment.fulfillmentNumber}</strong><p className="text-xs text-ink-mute">{datetime(fulfillment.fulfilledAt)} · {fulfillment.deliveryReference || 'Referans yok'} · Oluşturan ekip üyesi</p><p className="mt-2 text-sm">{fulfillment.note || 'Not yok'}</p><ul className="mt-2 text-sm">{fulfillmentItems.filter((value) => value.fulfillmentId === fulfillment.id).map((value) => { const item = items.find((candidate) => candidate.id === value.salesOrderItemId); return <li key={value.id}>{item?.description}: {value.fulfilledQuantity} {item?.unit}</li>; })}</ul></article>)}</div>}<p className="mt-3 text-xs text-ink-mute">Karşılama kayıtları eklemelidir; düzenlenemez, silinemez veya geri alınamaz.</p></section>
    <section className="rounded-card border border-line bg-surface p-5"><h2 className="font-serif text-xl">Durum Geçmişi</h2><div className="mt-4 space-y-2">{history.map((entry) => <div key={entry.id} className="border-b border-line pb-2 text-sm">{entry.fromStatus ? salesOrderStatusLabels[entry.fromStatus] : 'Başlangıç'} → {salesOrderStatusLabels[entry.toStatus]} · {datetime(entry.changedAt)} · Ekip üyesi<br/><small>{entry.reason || 'Neden belirtilmedi'}</small></div>)}</div></section>
    <SalesOrderInvoicePanel companyId={activeCompany!.id} role={activeCompany?.role} order={order} itemCount={items.length} partyName={party?.displayName ?? 'Firma'} contactName={contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : null} opportunityName={opportunity?.title ?? null} />
    {!canWrite && <p className="text-xs text-ink-mute">Bu satış siparişi salt okunurdur.</p>}
    {modal === "fulfillment" && <Modal title="Karşılama kaydet" onClose={() => !saving && setModal(null)} width="760px"><FulfillmentForm order={order} items={items} progress={progress} saving={saving} serverError={error} onCancel={() => setModal(null)} onSave={(input) => void recordFulfillment(input)} /></Modal>}
    {modal === "cancel" && <Modal title="Satış siparişini iptal et" onClose={() => !saving && setModal(null)}><label className="block text-sm">İptal nedeni<textarea className={`${inputClass} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>{error && <p role="alert" className="mt-2 text-sm text-crimson">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonSecondary} onClick={() => setModal(null)}>Vazgeç</button><button type="button" disabled={saving || !reason.trim()} className={buttonPrimary} onClick={() => void transition("cancelled", reason)}>İptal et</button></div></Modal>}
    {modal === "archive" && <Modal title="Satış siparişini arşivle" onClose={() => !saving && setModal(null)}><p className="text-sm">Bu taslak sipariş arşivlenecek; ticari snapshot korunacaktır.</p><div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonSecondary} onClick={() => setModal(null)}>Vazgeç</button><button type="button" disabled={saving} className={buttonPrimary} onClick={() => void archive()}>Arşivle</button></div></Modal>}
  </main>;
}
