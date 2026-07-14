import { useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import type { BusinessContact, BusinessParty } from "../../crm/types";
import type { SalesOpportunity } from "../../execution/types";
import type { QuoteCreateInput, QuoteItemInput } from "../types";
import { calculateQuoteVersion } from "../quoteCalculations";
import { normalizeQuoteCreate } from "../validation";
import { formatQuoteCurrency } from "../quoteViewModel";
import {
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "../../execution/ui/ExecutionUI";
import { contactOptions, opportunityOptions } from "./quoteUIModel";

const units = [
  "Adet",
  "Saat",
  "Gün",
  "Ay",
  "Paket",
  "Set",
  "Kg",
  "Metre",
  "Hizmet",
];
const blank = (position: number): QuoteItemInput => ({
  position,
  description: "",
  quantity: 1,
  unit: "Adet",
  unitPrice: 0,
  discountType: null,
  discountValue: 0,
  vatRate: 20,
  otherTaxRate: 0,
  unitCost: null,
});
export default function QuoteForm({
  initial,
  parties,
  contacts,
  opportunities,
  userId,
  revisionNote,
  onSave,
  saving,
  error,
  submitLabel = "Teklifi oluştur",
}: {
  initial?: Partial<QuoteCreateInput>;
  parties: BusinessParty[];
  contacts: BusinessContact[];
  opportunities: SalesOpportunity[];
  userId: string;
  revisionNote?: string;
  onSave: (v: QuoteCreateInput) => void;
  saving: boolean;
  error: string | null;
  submitLabel?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<QuoteCreateInput>({
    partyId: initial?.partyId ?? "",
    contactId: initial?.contactId ?? null,
    opportunityId: initial?.opportunityId ?? null,
    ownerUserId: initial?.ownerUserId ?? userId,
    currency: initial?.currency ?? "TRY",
    issueDate: initial?.issueDate ?? today,
    validUntil: initial?.validUntil ?? null,
    expectedDeliveryDate: initial?.expectedDeliveryDate ?? null,
    paymentTerms: initial?.paymentTerms ?? null,
    deliveryTerms: initial?.deliveryTerms ?? null,
    customerNotes: initial?.customerNotes ?? null,
    internalNotes: initial?.internalNotes ?? null,
    approvalRequired: initial?.approvalRequired ?? false,
    approvalReason: initial?.approvalReason ?? null,
    items: initial?.items?.length ? initial.items : [blank(1)],
  });
  const [validation, setValidation] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const preview = useMemo(() => {
    try {
      return calculateQuoteVersion(f.items);
    } catch {
      return null;
    }
  }, [f.items]);
  const set = <K extends keyof QuoteCreateInput>(
    k: K,
    v: QuoteCreateInput[K],
  ) => setF((x) => ({ ...x, [k]: v }));
  const item = (index: number, key: keyof QuoteItemInput, value: unknown) =>
    setF((x) => ({
      ...x,
      items: x.items.map((i, n) => (n === index ? { ...i, [key]: value } : i)),
    }));
  const normalizePositions = (items: QuoteItemInput[]) =>
    items.map((i, n) => ({ ...i, position: n + 1 }));
  const move = (index: number, by: number) =>
    setF((x) => {
      const list = [...x.items];
      const [to] = list.splice(index, 1);
      list.splice(index + by, 0, to);
      return { ...x, items: normalizePositions(list) };
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const checked = normalizeQuoteCreate(f);
    if (!checked.value) return setValidation(checked.error);
    if (revisionNote !== undefined && !revisionNote.trim())
      return setValidation("Revizyon notu gereklidir.");
    if (!confirm) return setConfirm(true);
    onSave(checked.value);
  };
  return (
    <form onSubmit={submit} className="space-y-6">
      {(validation || error) && (
        <p
          role="alert"
          className="rounded-lg bg-crimson/5 p-3 text-sm text-crimson"
        >
          {validation || error}
        </p>
      )}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-serif text-xl">Müşteri Bağlamı</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Firma
            <select
              required
              className={`${inputClass} mt-1`}
              value={f.partyId}
              onChange={(e) => {
                set("partyId", e.target.value);
                set("contactId", null);
                set("opportunityId", null);
              }}
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
            İlgili kişi
            <select
              className={`${inputClass} mt-1`}
              value={f.contactId ?? ""}
              onChange={(e) => set("contactId", e.target.value || null)}
            >
              <option value="">Seçilmedi</option>
              {contactOptions(contacts, f.partyId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fırsat
            <select
              className={`${inputClass} mt-1`}
              value={f.opportunityId ?? ""}
              onChange={(e) => set("opportunityId", e.target.value || null)}
            >
              <option value="">Seçilmedi</option>
              {opportunityOptions(opportunities, f.partyId).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sorumlu
            <input disabled className={`${inputClass} mt-1`} value="Siz" />
          </label>
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-serif text-xl">Tarihler ve Koşullar</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(
            [
              ["Düzenleme tarihi", "issueDate"],
              ["Geçerlilik tarihi", "validUntil"],
              ["Beklenen teslimat", "expectedDeliveryDate"],
            ] as const
          ).map(([l, k]) => (
            <label key={k} className="text-sm">
              {l}
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={(f[k] as string | null) ?? ""}
                onChange={(e) => set(k, e.target.value || (null as never))}
              />
            </label>
          ))}
          <label className="text-sm">
            Para birimi
            <select
              className={`${inputClass} mt-1`}
              value={f.currency}
              onChange={(e) =>
                set("currency", e.target.value as QuoteCreateInput["currency"])
              }
            >
              {["TRY", "EUR", "USD", "GBP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(
            [
              ["Ödeme koşulları", "paymentTerms"],
              ["Teslimat koşulları", "deliveryTerms"],
              ["Müşteriye açık notlar", "customerNotes"],
              ["İç notlar", "internalNotes"],
            ] as const
          ).map(([l, k]) => (
            <label key={k} className="text-sm">
              {l}
              <textarea
                className={`${inputClass} mt-1`}
                value={(f[k] as string | null) ?? ""}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
        </div>
        <label className="mt-4 flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.approvalRequired}
            onChange={(e) => set("approvalRequired", e.target.checked)}
          />
          Owner onayı gerektir
        </label>
        {f.approvalRequired && (
          <label className="mt-3 block text-sm">
            Onay nedeni
            <textarea
              className={`${inputClass} mt-1`}
              value={f.approvalReason ?? ""}
              onChange={(e) => set("approvalReason", e.target.value)}
            />
          </label>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex justify-between">
          <h2 className="font-serif text-xl">Teklif Kalemleri</h2>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() =>
              setF((x) => ({
                ...x,
                items: [...x.items, blank(x.items.length + 1)],
              }))
            }
          >
            <Plus size={15} className="inline" /> Kalem ekle
          </button>
        </div>
        {f.items.map((i, index) => (
          <article
            key={index}
            className="rounded-card border border-line bg-surface p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs">
                Kod
                <input
                  className={`${inputClass} mt-1`}
                  value={i.itemCode ?? ""}
                  onChange={(e) => item(index, "itemCode", e.target.value)}
                />
              </label>
              <label className="text-xs sm:col-span-2">
                Açıklama
                <input
                  required
                  className={`${inputClass} mt-1`}
                  value={i.description}
                  onChange={(e) => item(index, "description", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Miktar
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={i.quantity}
                  onChange={(e) =>
                    item(index, "quantity", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                Birim
                <input
                  list="quote-units"
                  className={`${inputClass} mt-1`}
                  value={i.unit}
                  onChange={(e) => item(index, "unit", e.target.value)}
                />
              </label>
              <label className="text-xs">
                Birim fiyat
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={i.unitPrice}
                  onChange={(e) =>
                    item(index, "unitPrice", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                İndirim türü
                <select
                  className={`${inputClass} mt-1`}
                  value={i.discountType ?? ""}
                  onChange={(e) =>
                    item(index, "discountType", e.target.value || null)
                  }
                >
                  <option value="">Yok</option>
                  <option value="percentage">Yüzde</option>
                  <option value="fixed">Sabit</option>
                </select>
              </label>
              <label className="text-xs">
                İndirim
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={i.discountValue ?? 0}
                  onChange={(e) =>
                    item(index, "discountValue", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                KDV %
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={i.vatRate ?? 20}
                  onChange={(e) =>
                    item(index, "vatRate", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                Diğer vergi %
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={i.otherTaxRate ?? 0}
                  onChange={(e) =>
                    item(index, "otherTaxRate", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                Birim maliyet
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={i.unitCost ?? ""}
                  onChange={(e) =>
                    item(
                      index,
                      "unitCost",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                aria-label="Yukarı taşı"
                type="button"
                disabled={!index}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                aria-label="Aşağı taşı"
                type="button"
                disabled={index === f.items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                aria-label="Kalemi çoğalt"
                type="button"
                onClick={() =>
                  setF((x) => ({
                    ...x,
                    items: normalizePositions([
                      ...x.items.slice(0, index + 1),
                      { ...i },
                      ...x.items.slice(index + 1),
                    ]),
                  }))
                }
              >
                <Copy size={16} />
              </button>
              <button
                aria-label="Kalemi kaldır"
                type="button"
                disabled={f.items.length === 1}
                onClick={() =>
                  setF((x) => ({
                    ...x,
                    items: normalizePositions(
                      x.items.filter((_, n) => n !== index),
                    ),
                  }))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        <datalist id="quote-units">
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </datalist>
      </section>
      {preview && (
        <section className="rounded-card border border-crimson/20 bg-crimson/5 p-5">
          <h2 className="font-serif text-xl">Canlı Hesaplama Önizlemesi</h2>
          <p className="text-xs text-ink-mute">
            Bu değerler önizlemedir; kayıt sonrası Supabase tarafından
            doğrulanan toplamlar gösterilir.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Ara toplam", preview.subtotal],
              ["İndirim", preview.discountTotal],
              ["KDV", preview.taxTotal],
              ["Diğer vergi", preview.otherTaxTotal],
              ["Genel toplam", preview.grandTotal],
              ["Toplam maliyet", preview.totalCost],
              ["Brüt marj", preview.grossMargin],
              ["Marj %", preview.grossMarginPct],
            ].map(([l, v]) => (
              <div key={l as string}>
                <dt className="text-xs text-ink-mute">{l}</dt>
                <dd>
                  {v == null
                    ? "Eksik"
                    : l === "Marj %"
                      ? `%${v}`
                      : formatQuoteCurrency(v as number, f.currency ?? "TRY")}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {confirm && preview && (
        <section
          role="status"
          className="rounded-card border border-line bg-surface p-5"
        >
          <h2 className="font-serif text-xl">Onay Özeti</h2>
          <p>
            {parties.find((p) => p.id === f.partyId)?.displayName} ·{" "}
            {f.items.length} kalem ·{" "}
            {formatQuoteCurrency(preview.grandTotal, f.currency ?? "TRY")}
          </p>
          <p className="text-sm text-ink-mute">
            Marj verisi {preview.totalCost == null ? "eksik" : "tam"} ·{" "}
            {f.paymentTerms || "Ödeme koşulu yok"}
          </p>
        </section>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving
            ? "Kaydediliyor…"
            : confirm
              ? submitLabel
              : "Özeti kontrol et"}
        </button>
      </div>
    </form>
  );
}
