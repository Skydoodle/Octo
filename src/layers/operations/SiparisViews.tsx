import { useState } from 'react'
import { Card } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import {
  useOpStore, setSiparisDurum, deleteSiparis, acikAlisSiparisYukumlulukleri,
  updateSiparisObligation,
} from './opStore'
import {
  siparisToplam, siparisDurumuLabels, siparisGecisleri,
  type Siparis, type SiparisDurumu, type SiparisOdemeDurumu, type SiparisParaBirimi,
} from './types'
import NewSiparisForm from './NewSiparisForm'
import Modal from '../../surfaces/dashboard/components/Modal'
import { useFinanceStore } from '../finance/financeStore'
import { reconcilePurchaseOrder } from './purchaseOrderObligations'

const fmt = (n: number, currency: SiparisParaBirimi = 'TRY') => `${Math.round(n).toLocaleString('tr-TR')} ${currency === 'TRY' ? 'TL' : currency}`

const durumRenk: Record<SiparisDurumu, string> = {
  taslak: 'bg-ink-mute/15 text-ink-mute',
  onaylandi: 'bg-warn/15 text-warn',
  kismi: 'bg-warn/15 text-warn',
  tamamlandi: 'bg-positive/15 text-positive',
  iptal: 'bg-crimson/15 text-crimson',
}

export function SiparisView() {
  const { siparisler } = useOpStore()
  const { invoices } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editObligation, setEditObligation] = useState<Siparis | null>(null)
  const [tur, setTur] = useState<'hepsi' | 'satis' | 'alis'>('hepsi')

  const filtered = tur === 'hepsi' ? siparisler : siparisler.filter(s => s.tur === tur)
  const yukumluluker = acikAlisSiparisYukumlulukleri(invoices)
  const toplamAlisYuk = yukumluluker.reduce((s, y) => s + y.amount, 0)

  return (
    <div className="space-y-5">
      {/* Açık alış siparişi nakit yükümlülüğü — cross-arm → Finans */}
      {toplamAlisYuk > 0 && (
        <Card className="border-warn/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-ink">Açık Alış Siparişi Yükümlülüğü</span>
              <div className="mt-0.5 text-xs text-ink-mute">{yukumluluker.length} sipariş · gelecek nakit çıkışı (Finans projeksiyonuna işlenir)</div>
            </div>
            <span className="font-mono text-lg text-warn">{fmt(toplamAlisYuk)}</span>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['hepsi', 'satis', 'alis'] as const).map(t => (
            <button key={t} onClick={() => setTur(t)}
              className={'rounded px-3.5 py-1.5 text-xs ' + (tur === t ? 'bg-ink text-paper font-medium' : 'border border-line text-ink-mute hover:text-ink')}>
              {t === 'hepsi' ? 'Tümü' : t === 'satis' ? 'Satış' : 'Alış'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90">+ Yeni Sipariş</button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6"><EmptyState title="Sipariş yok" hint="Satış/alış siparişi oluşturunca durum takibi, sevkiyat ve fatura bağlanır." /></Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2">
                <tr>
                  <th className="px-5 py-3 text-left"><span className="label text-ink-mute">Sipariş</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Cari</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Tür</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Teslim</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Ödeme</span></th>
                  <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Tutar</span></th>
                  <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Durum</span></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const t = siparisToplam(s)
                  const sonraki = siparisGecisleri[s.durum]
                  const reconciliation = s.tur === 'alis' ? reconcilePurchaseOrder(s, invoices, siparisler) : null
                  const currency = reconciliation?.currency ?? s.paraBirimi ?? 'TRY'
                  return (
                    <tr key={s.id} className={i > 0 ? 'border-t border-line' : ''}>
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs text-ink">{s.no}</div>
                        <div className="text-xs text-ink-mute">{s.satirlar.length} kalem · {s.tarih}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{s.cariUnvan}</td>
                      <td className="px-4 py-3">
                        <span className={'rounded px-2 py-0.5 text-xs ' + (s.tur === 'satis' ? 'bg-positive/10 text-positive' : 'bg-warn/10 text-warn')}>
                          {s.tur === 'satis' ? 'Satış' : 'Alış'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-mute">{s.teslimTarihi}</td>
                      <td className="px-4 py-3 text-xs">
                        {s.tur === 'alis' ? (
                          <div>
                            <div className={s.odemeTarihi ? 'font-mono text-ink-soft' : 'text-warn'}>{s.odemeTarihi || 'tarih eksik'}</div>
                            <div className="mt-0.5 text-[10px] text-ink-mute">kalan {fmt(reconciliation?.remainingAmount ?? 0, currency)}</div>
                          </div>
                        ) : <span className="text-ink-mute">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink">{fmt(t.genelToplam, currency)}</td>
                      <td className="px-4 py-3">
                        <span className={'rounded px-2 py-0.5 text-xs ' + durumRenk[s.durum]}>{siparisDurumuLabels[s.durum]}</span>
                        {reconciliation && reconciliation.invoiceCoverage > 0 && (
                          <span className="ml-1 rounded bg-positive/10 px-1.5 py-0.5 text-[10px] text-positive">
                            {reconciliation.fullyCovered ? 'faturalı' : 'kısmi faturalı'}
                          </span>
                        )}
                        {reconciliation && reconciliation.linkIssues.length > 0 && <span className="ml-1 text-[10px] text-warn">bağlantı kontrolü</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {s.tur === 'alis' && (
                            <button onClick={() => setEditObligation(s)} className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-crimson hover:text-crimson">
                              ödeme planı
                            </button>
                          )}
                          {sonraki.filter(d => d !== 'iptal').map(d => (
                            <button key={d} onClick={() => setSiparisDurum(s.id, d)} className="rounded border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-crimson hover:text-crimson">
                              → {siparisDurumuLabels[d]}
                            </button>
                          ))}
                          {(s.durum === 'taslak' || s.durum === 'iptal') && (
                            <button onClick={() => deleteSiparis(s.id)} className="text-xs text-ink-mute hover:text-crimson">sil</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <NewSiparisForm onClose={() => setShowForm(false)} />}
      {editObligation && (
        <SiparisObligationModal order={editObligation} invoices={invoices} onClose={() => setEditObligation(null)} />
      )}
    </div>
  )
}

function SiparisObligationModal({
  order,
  invoices,
  onClose,
}: {
  order: Siparis
  invoices: ReturnType<typeof useFinanceStore>['invoices']
  onClose: () => void
}) {
  const initialCurrency = order.paraBirimi === 'USD' || order.paraBirimi === 'EUR' ? order.paraBirimi : 'TRY'
  const [date, setDate] = useState(order.odemeTarihi ?? '')
  const [currency, setCurrency] = useState<SiparisParaBirimi>(initialCurrency)
  const [paymentStatus, setPaymentStatus] = useState<SiparisOdemeDurumu>(order.odemeDurumu === 'odendi' ? 'odendi' : 'bekliyor')
  const { siparisler } = useOpStore()
  const reconciliation = reconcilePurchaseOrder(order, invoices, siparisler)
  const inputClass = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'

  const save = () => {
    updateSiparisObligation(order.id, {
      odemeTarihi: date || undefined,
      paraBirimi: currency,
      odemeDurumu: paymentStatus,
    })
    onClose()
  }

  return (
    <Modal title="Alış Siparişi Ödeme Planı" onClose={onClose} width="540px">
      <div className="space-y-5">
        <div className="rounded border border-line bg-surface-2 p-3 text-sm">
          <div className="font-medium text-ink">{order.no} · {order.cariUnvan}</div>
          <div className="mt-1 text-xs text-ink-mute">
            Sipariş {fmt(reconciliation.orderTotal, reconciliation.currency)} · fatura kapsamı {fmt(reconciliation.invoiceCoverage, reconciliation.currency)} · kalan {fmt(reconciliation.remainingAmount, reconciliation.currency)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="label mb-1.5 block text-ink-mute">Ödeme Tarihi</span>
            <input type="date" className={inputClass} value={date} onChange={event => setDate(event.target.value)} />
          </div>
          <div>
            <span className="label mb-1.5 block text-ink-mute">Para Birimi</span>
            <select className={inputClass} value={currency} onChange={event => setCurrency(event.target.value as SiparisParaBirimi)}>
              <option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <span className="label mb-1.5 block text-ink-mute">Ödeme Durumu</span>
            <select className={inputClass} value={paymentStatus} onChange={event => setPaymentStatus(event.target.value as SiparisOdemeDurumu)}>
              <option value="bekliyor">Bekliyor</option><option value="odendi">Ödendi</option>
            </select>
          </div>
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Bağlı Faturalar</span>
          {reconciliation.linkedInvoices.length > 0 ? (
            <div className="space-y-1 rounded border border-line p-3">
              {reconciliation.linkedInvoices.map(invoice => (
                <div key={invoice.id} className="flex justify-between text-xs text-ink-soft">
                  <span>{invoice.id} · {invoice.contactName}</span>
                  <span className="font-mono">{invoice.total.toLocaleString('tr-TR')} {invoice.currency}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-ink-mute">Geçerli fatura bağlantısı yok.</p>}
          {reconciliation.linkIssues.length > 0 && (
            <p className="mt-2 text-xs text-warn">{reconciliation.linkIssues.length} bağlantı doğrulanamadı; bu tutarlar siparişten düşülmedi.</p>
          )}
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink">İptal</button>
          <button onClick={save} className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">Kaydet</button>
        </div>
      </div>
    </Modal>
  )
}
