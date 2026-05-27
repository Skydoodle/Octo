import { useState } from 'react'
import { mockInvoices } from '../mockData'

const fmt = (n: number) => '₺' + n.toLocaleString('tr-TR')

const statusLabel: Record<string, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  paid: 'Ödendi',
  overdue: 'Gecikmiş',
  cancelled: 'İptal',
}

const statusColor: Record<string, string> = {
  draft: '#8A8680',
  sent: '#E8A838',
  paid: '#4CAF84',
  overdue: '#E24B4A',
  cancelled: '#8A8680',
}

export default function Invoices() {
  const [filter, setFilter] = useState<'all' | 'sent' | 'paid' | 'overdue'>('all')

  const salesInvoices = mockInvoices.filter(inv => inv.type === 'sales')
  const filtered = filter === 'all' ? salesInvoices : salesInvoices.filter(inv => inv.status === filter)

  const total = filtered.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'sent', 'overdue', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                border: '1px solid',
                borderColor: filter === f ? '#1A1A1A' : '#E2DDD4',
                background: filter === f ? '#1A1A1A' : '#fff',
                color: filter === f ? '#fff' : '#8A8680',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontWeight: filter === f ? 500 : 400,
              }}
            >
              {f === 'all' ? 'Tümü' : statusLabel[f]}
            </button>
          ))}
        </div>
        <button style={{ padding: '8px 16px', background: '#C34B4B', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px' }}>
          + Yeni Fatura
        </button>
      </div>

      {/* Invoice table */}
      <div style={{ background: '#fff', border: '1px solid #E2DDD4' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid #E2DDD4', background: '#F7F4EE' }}>
          {['Müşteri', 'Tarih', 'Vade', 'Tutar', 'Durum'].map(h => (
            <div key={h} style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8A8680', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {filtered.map((inv, i) => (
          <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #E2DDD4' : 'none', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '2px' }}>{inv.contactName}</div>
              <div style={{ fontSize: '11px', color: '#8A8680' }}>{inv.description}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8A8680' }}>{inv.issueDate}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: inv.status === 'overdue' ? '#E24B4A' : '#8A8680' }}>{inv.dueDate}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>{fmt(inv.total)}</div>
            <div>
              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: statusColor[inv.status] + '20', color: statusColor[inv.status] }}>
                {statusLabel[inv.status]}
              </span>
            </div>
          </div>
        ))}

        <div style={{ padding: '14px 20px', background: '#F7F4EE', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8A8680', textTransform: 'uppercase', letterSpacing: '0.08em', gridColumn: '1/4' }}>Toplam ({filtered.length} fatura)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>{fmt(total)}</div>
        </div>
      </div>
    </div>
  )
}