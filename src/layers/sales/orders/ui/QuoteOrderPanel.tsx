/* eslint-disable react-hooks/set-state-in-effect -- linked order follows the selected quotation */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import { Badge, Notice, buttonPrimary, buttonSecondary, date, inputClass } from "../../execution/ui/ExecutionUI";
import type { SalesQuote, SalesQuoteVersion } from "../../quotes/types";
import { convertAcceptedQuoteToSalesOrder, getSalesOrderForQuote } from "../salesOrderRepository";
import { formatOrderCurrency, salesOrderStatusLabels } from "../salesOrderViewModel";
import type { SalesOrder } from "../types";
import { loadOrderProgress } from "./orderUIData";
import { canConvertQuoteToOrder, type OrderProgress } from "./orderUIModel";

export default function QuoteOrderPanel({
  companyId,
  role,
  quote,
  version,
  itemCount,
  partyName,
  contactName,
  opportunityName,
  ownerName,
}: {
  companyId: string;
  role: string | null | undefined;
  quote: SalesQuote;
  version: SalesQuoteVersion;
  itemCount: number;
  partyName: string;
  contactName: string | null;
  opportunityName: string | null;
  ownerName: string;
}) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [progress, setProgress] = useState<OrderProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(quote.expectedDeliveryDate ?? "");
  const [internalNote, setInternalNote] = useState(quote.internalNotes ?? "");
  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSalesOrderForQuote(companyId, quote.id);
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setOrder(result.data);
    if (result.data) {
      const progressResult = await loadOrderProgress(companyId, result.data);
      setProgress(progressResult.data?.progress ?? null);
    } else setProgress(null);
    setLoading(false);
  }, [companyId, quote.id]);
  useEffect(() => { void load(); }, [load]);
  const convert = async () => {
    setSaving(true);
    setError(null);
    const result = await convertAcceptedQuoteToSalesOrder(companyId, {
      quoteId: quote.id,
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate || null,
      internalNote: internalNote || null,
    });
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setOpen(false);
    await load();
    navigate(`/dashboard/satis/satis-siparisleri/${result.data.salesOrderId}`, {
      state: { notice: "Satış siparişi başarıyla oluşturuldu." },
    });
  };
  return <section className="rounded-card border border-line bg-surface p-5">
    <h2 className="font-serif text-xl">Satış Siparişi</h2>
    {error && <Notice error>{error}</Notice>}
    {loading ? <p className="mt-3 text-sm text-ink-soft">Sipariş bağlantısı kontrol ediliyor…</p> : order ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"><div><strong>{order.orderNumber}</strong><p className="mt-1 text-sm"><Badge>{salesOrderStatusLabels[order.status]}</Badge> · {date(order.orderDate)} · %{Math.round(progress?.percentage ?? 0)} karşılandı</p></div><Link className={buttonSecondary} to={`/dashboard/satis/satis-siparisleri/${order.id}`}>Siparişi aç</Link></div> : quote.status === "accepted" ? canConvertQuoteToOrder(quote, false, role) ? <button type="button" className={`${buttonPrimary} mt-4`} onClick={() => setOpen(true)}>Satış siparişi oluştur</button> : <p className="mt-3 text-sm text-ink-soft">Bu kabul edilmiş teklif için henüz satış siparişi oluşturulmadı. Sipariş oluşturma yetkiniz bulunmuyor.</p> : <p className="mt-3 text-sm text-ink-soft">Satış siparişi yalnız kabul edilmiş tekliflerden oluşturulabilir.</p>}
    {open && <Modal title="Satış siparişi oluştur" onClose={() => !saving && setOpen(false)} width="720px">
      <div className="grid gap-3 rounded-lg bg-crimson/5 p-4 text-sm sm:grid-cols-2">
        <Summary label="Teklif" value={`${quote.quoteNumber} · v${version.versionNumber}`} />
        <Summary label="Firma" value={partyName} />
        <Summary label="İlgili kişi" value={contactName ?? "—"} />
        <Summary label="Fırsat" value={opportunityName ?? "—"} />
        <Summary label="Sorumlu" value={ownerName} />
        <Summary label="Toplam" value={formatOrderCurrency(version.grandTotal, quote.currency)} />
        <Summary label="Kalem sayısı" value={String(itemCount)} />
        <Summary label="Para birimi" value={quote.currency} />
        <Summary label="Ödeme koşulları" value={quote.paymentTerms ?? "—"} />
        <Summary label="Teslimat koşulları" value={quote.deliveryTerms ?? "—"} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm">Sipariş tarihi<input required type="date" className={`${inputClass} mt-1`} value={orderDate} onChange={(event) => setOrderDate(event.target.value)} /></label><label className="text-sm">Beklenen teslimat tarihi<input type="date" className={`${inputClass} mt-1`} value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} /></label></div>
      <label className="mt-3 block text-sm">İç not<textarea className={`${inputClass} mt-1`} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></label>
      {error && <p role="alert" className="mt-3 text-sm text-crimson">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonSecondary} onClick={() => setOpen(false)}>Vazgeç</button><button type="button" disabled={saving || !orderDate} className={buttonPrimary} onClick={() => void convert()}>{saving ? "Oluşturuluyor…" : "Satış siparişi oluştur"}</button></div>
    </Modal>}
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><span className="text-xs text-ink-mute">{label}</span><p>{value}</p></div>;
}
