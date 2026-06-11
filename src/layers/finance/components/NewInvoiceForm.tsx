import { useState } from 'react'
import Modal from '../../../surfaces/dashboard/components/Modal'
import type { Invoice } from '../types'
import { tevkifatOranlari, tevkifatKategorileri, type TevkifatOrani } from '../../tax/logic/tevkifat'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

interface Props {
  onClose: () => void
  onSave: (invoice: Invoice) => void
}

const inputCls = 'w-full rounded border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-mute'

export default function NewInvoiceForm({ onClose, onSave }: Props) {
  const [type, setType] = useState<'sales' | 'purchase'>('sales')
  const [kdvDurumu, setKdvDurumu] = useState<'normal' | 'tevkifat' | 'istisna'>('normal')
  const [tevkifatOrani, setTevkifatOrani] = useState<TevkifatOrani>('9/10')
  const [contactName, setContactName] = useState('')
  const [contactTaxId, setContactTaxId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, vatRate: 20 },
  ])

  const addLine = () =>
    setLineItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, vatRate: 20 }])

  const removeLine = (id: string) =>
    setLineItems(prev => prev.filter(l => l.id !== id))

  const updateLine = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)))

  const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const vatAmount = lineItems.reduce((s, l) => s + (l.quantity * l.unitPrice * l.vatRate) / 100, 0)
  const total = subtotal + vatAmount

  const fmt = (n: number) =>
    '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const buildInvoice = (status: Invoice['status']): Invoice | null => {
    if (!contactName || !dueDate || lineItems.some(l => !l.description)) return null
    return {
      id: 'inv' + Date.now(),
      type,
      contactName,
      contactTaxId,
      amount: subtotal,
      vatAmount,
      total,
      vatRate: lineItems[0]?.vatRate ?? 20,
      currency: 'TRY',
      issueDate,
      dueDate,
      status,
      description: lineItems[0]?.description || '',
      kdvDurumu,
      tevkifatOrani: kdvDurumu === 'tevkifat' ? tevkifatOrani : undefined,
    }
  }

  const handleSave = (status: Invoice['status']) => {
    const inv = buildInvoice(status)
    if (!inv) return
    onSave(inv)
    onClose()
  }

  return (
    <Modal title="Yeni Fatura" onClose={onClose} width="680px">
      {/* Invoice type */}
      <div className="mb-5">
        <span className="label mb-1.5 block text-ink-mute">Fatura Tipi</span>
        <div className="flex">
          {(['sales', 'purchase'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={'flex-1 border border-line px-3 py-2.5 text-sm transition-colors ' +
                (t === 'sales' ? 'rounded-l border-r-0 ' : 'rounded-r ') +
                (type === t ? 'bg-ink font-medium text-paper' : 'bg-surface text-ink-mute hover:text-ink')}
            >
              {t === 'sales' ? 'Satış Faturası' : 'Alış Faturası'}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <span className="label mb-1.5 block text-ink-mute">{type === 'sales' ? 'Müşteri' : 'Tedarikçi'}</span>
          <input
            className={inputCls}
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder={type === 'sales' ? 'Müşteri adı' : 'Tedarikçi adı'}
          />
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">VKN / TCKN</span>
          <input
            className={inputCls}
            value={contactTaxId}
            onChange={e => setContactTaxId(e.target.value)}
            placeholder="Vergi / TC kimlik no"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <span className="label mb-1.5 block text-ink-mute">Fatura Tarihi</span>
          <input type="date" className={inputCls} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
        </div>
        <div>
          <span className="label mb-1.5 block text-ink-mute">Vade Tarihi</span>
          <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* KDV durumu */}
      <div className="mb-5">
        <span className="label mb-1.5 block text-ink-mute">KDV Durumu</span>
        <div className="flex gap-2">
          {([['normal','Normal'],['tevkifat','Tevkifatlı'],['istisna','İstisna']] as const).map(([v,l]) => (
            <button
              key={v}
              onClick={() => setKdvDurumu(v)}
              className={'flex-1 rounded border px-3 py-2 text-sm transition-colors ' +
                (kdvDurumu === v ? 'border-crimson bg-crimson/5 font-medium text-crimson' : 'border-line text-ink-mute hover:text-ink')}
            >
              {l}
            </button>
          ))}
        </div>

        {kdvDurumu === 'tevkifat' && (
          <div className="mt-3">
            <span className="label mb-1.5 block text-ink-mute">Tevkifat Oranı</span>
            <select
              className={inputCls + ' cursor-pointer'}
              value={tevkifatOrani}
              onChange={e => setTevkifatOrani(e.target.value as TevkifatOrani)}
            >
              {tevkifatKategorileri.map(k => (
                <option key={k.kod} value={k.oran}>{k.ad} ({k.oran})</option>
              ))}
              {tevkifatOranlari.map(o => (
                <option key={o} value={o}>Oran: {o}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-mute">Alıcı, KDV’nin {tevkifatOrani} kadarını keser ve 2 No’lu beyanname ile öder.</p>
          </div>
        )}
        {kdvDurumu === 'istisna' && (
          <p className="mt-2 text-xs text-ink-mute">İstisna işlemde KDV hesaplanmaz; matrah ayrı izlenir (ihracat vb.).</p>
        )}
      </div>

      {/* Line items */}
      <div className="mb-5">
        <div className="mb-2 grid grid-cols-[3fr_80px_100px_80px_32px] gap-2">
          {['Açıklama', 'Adet', 'Birim Fiyat', 'KDV %', ''].map((h, i) => (
            <span key={i} className="label text-ink-mute">{h}</span>
          ))}
        </div>

        {lineItems.map(line => (
          <div key={line.id} className="mb-2 grid grid-cols-[3fr_80px_100px_80px_32px] gap-2">
            <input
              className={inputCls}
              value={line.description}
              onChange={e => updateLine(line.id, 'description', e.target.value)}
              placeholder="Ürün veya hizmet açıklaması"
            />
            <input
              type="number"
              className={inputCls + ' text-right'}
              value={line.quantity}
              onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
            />
            <input
              type="number"
              className={inputCls + ' text-right'}
              value={line.unitPrice || ''}
              onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <select
              className={inputCls + ' cursor-pointer'}
              value={line.vatRate}
              onChange={e => updateLine(line.id, 'vatRate', parseFloat(e.target.value))}
            >
              <option value={0}>%0</option>
              <option value={1}>%1</option>
              <option value={10}>%10</option>
              <option value={20}>%20</option>
            </select>
            <button
              onClick={() => removeLine(line.id)}
              disabled={lineItems.length === 1}
              className="rounded border border-line text-base text-ink-mute disabled:cursor-not-allowed disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addLine}
          className="mt-1 rounded border border-dashed border-line px-4 py-2 text-sm text-ink-mute hover:text-ink"
        >
          + Satır ekle
        </button>
      </div>

      {/* Totals */}
      <div className="mb-6 rounded-card border border-line bg-surface px-5 py-4">
        <div className="mb-2 flex justify-between">
          <span className="text-sm text-ink-mute">Ara Toplam</span>
          <span className="font-mono text-sm text-ink">{fmt(subtotal)}</span>
        </div>
        <div className="mb-2 flex justify-between">
          <span className="text-sm text-ink-mute">KDV</span>
          <span className="font-mono text-sm text-ink">{fmt(vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-3">
          <span className="text-sm font-medium text-ink">Genel Toplam</span>
          <span className="font-mono text-lg font-medium text-crimson">{fmt(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2.5">
        <button
          onClick={onClose}
          className="rounded border border-line px-5 py-2.5 text-sm text-ink-mute hover:text-ink"
        >
          İptal
        </button>
        <button
          onClick={() => handleSave('draft')}
          className="rounded bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Taslak Kaydet
        </button>
        <button
          onClick={() => handleSave('sent')}
          className="rounded bg-crimson px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Faturalandır →
        </button>
      </div>
    </Modal>
  )
}
