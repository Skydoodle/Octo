import { useState } from 'react'
import Modal from '../../../surfaces/dashboard/components/Modal'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

interface Props {
  onClose: () => void
  onSave: (invoice: any) => void
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid rgb(var(--line))',
  background: 'rgb(var(--surface))',
  fontSize: '13px',
  color: 'rgb(var(--ink))',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
}

const labelStyle = {
  fontFamily: 'monospace',
  fontSize: '10px',
  color: 'rgb(var(--ink-mute))',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '6px',
  display: 'block',
}

export default function NewInvoiceForm({ onClose, onSave }: Props) {
  const [type, setType] = useState<'sales' | 'purchase'>('sales')
  const [contactName, setContactName] = useState('')
  const [contactTaxId, setContactTaxId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, vatRate: 20 }
  ])

  const addLine = () => {
    setLineItems(prev => [...prev, {
      id: Date.now().toString(),
      description: '', quantity: 1, unitPrice: 0, vatRate: 20
    }])
  }

  const removeLine = (id: string) => {
    setLineItems(prev => prev.filter(l => l.id !== id))
  }

  const updateLine = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const vatAmount = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice * l.vatRate / 100, 0)
  const total = subtotal + vatAmount

  const fmt = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleSave = () => {
    if (!contactName || !dueDate || lineItems.some(l => !l.description)) return
    onSave({
      id: 'inv' + Date.now(),
      type,
      contactName,
      contactTaxId,
      issueDate,
      dueDate,
      lineItems,
      subtotal,
      vatAmount,
      total,
      vatRate: 20,
      currency: 'TRY',
      status: 'draft',
      description: lineItems[0]?.description || '',
    })
    onClose()
  }

  return (
    <Modal title="Yeni Fatura" onClose={onClose} width="680px">

      {/* Invoice type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Fatura Tipi</label>
        <div style={{ display: 'flex', gap: '0' }}>
          {(['sales', 'purchase'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1, padding: '10px',
                border: '1px solid rgb(var(--line))',
                borderRight: t === 'sales' ? 'none' : '1px solid rgb(var(--line))',
                background: type === t ? 'rgb(var(--ink))' : 'rgb(var(--surface))',
                color: type === t ? 'rgb(var(--surface))' : 'rgb(var(--ink-mute))',
                fontSize: '13px', fontWeight: type === t ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              {t === 'sales' ? 'Satış Faturası' : 'Alış Faturası'}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>{type === 'sales' ? 'Müşteri' : 'Tedarikçi'}</label>
          <input
            style={inputStyle}
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder={type === 'sales' ? 'Müşteri adı' : 'Tedarikçi adı'}
          />
        </div>
        <div>
          <label style={labelStyle}>VKN / TCKN</label>
          <input
            style={inputStyle}
            value={contactTaxId}
            onChange={e => setContactTaxId(e.target.value)}
            placeholder="Vergi / TC kimlik no"
          />
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Fatura Tarihi</label>
          <input type="date" style={inputStyle} value={issueDate} onChange={e => setIssueDate(e.target.value)}/>
        </div>
        <div>
          <label style={labelStyle}>Vade Tarihi</label>
          <input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)}/>
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 80px 100px 80px 32px', gap: '8px', marginBottom: '8px' }}>
          {['Açıklama', 'Adet', 'Birim Fiyat', 'KDV %', ''].map(h => (
            <div key={h} style={labelStyle}>{h}</div>
          ))}
        </div>

        {lineItems.map((line, i) => (
          <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '3fr 80px 100px 80px 32px', gap: '8px', marginBottom: '8px' }}>
            <input
              style={inputStyle}
              value={line.description}
              onChange={e => updateLine(line.id, 'description', e.target.value)}
              placeholder="Ürün veya hizmet açıklaması"
            />
            <input
              type="number"
              style={{ ...inputStyle, textAlign: 'right' }}
              value={line.quantity}
              onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
            />
            <input
              type="number"
              style={{ ...inputStyle, textAlign: 'right' }}
              value={line.unitPrice || ''}
              onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
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
              style={{ background: 'none', border: '1px solid rgb(var(--line))', cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer', color: 'rgb(var(--ink-mute))', fontSize: '16px' }}
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addLine}
          style={{ padding: '8px 16px', background: 'none', border: '1px dashed rgb(var(--line))', color: 'rgb(var(--ink-mute))', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}
        >
          + Satır ekle
        </button>
      </div>

      {/* Totals */}
      <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', padding: '16px 20px', marginBottom: '24px' }}>
        {[
          ['Ara Toplam', fmt(subtotal)],
          ['KDV', fmt(vatAmount)],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'rgb(var(--ink-mute))' }}>{l}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'rgb(var(--ink))' }}>{v}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgb(var(--line))' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--ink))' }}>Genel Toplam</div>
          <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 500, color: 'rgb(var(--crimson))' }}>{fmt(total)}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ padding: '10px 20px', background: 'none', border: '1px solid rgb(var(--line))', color: 'rgb(var(--ink-mute))', fontSize: '13px', cursor: 'pointer' }}
        >
          İptal
        </button>
        <button
          onClick={() => { handleSave() }}
          style={{ padding: '10px 20px', background: 'rgb(var(--ink))', border: 'none', color: 'rgb(var(--surface))', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Taslak Kaydet
        </button>
        <button
          onClick={handleSave}
          style={{ padding: '10px 20px', background: 'rgb(var(--crimson))', border: 'none', color: 'rgb(var(--surface))', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Faturalandır →
        </button>
      </div>
    </Modal>
  )
}