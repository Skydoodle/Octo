import { useState } from 'react'
import { useFinanceStore, addInvoice } from '../financeStore'
import type { Invoice } from '../types'
import NewInvoiceForm from './NewInvoiceForm'
import ExcelImport from '../../../import/ExcelImport'

const fmt = (n: number) => '₺' + n.toLocaleString('tr-TR')

const statusLabel: Record<string, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  paid: 'Ödendi',
  overdue: 'Gecikmiş',
  cancelled: 'İptal',
}

const statusClass: Record<string, string> = {
  draft: 'text-ink-mute bg-ink-mute/10',
  sent: 'text-warn bg-warn/10',
  paid: 'text-positive bg-positive/10',
  overdue: 'text-crimson bg-crimson/10',
  cancelled: 'text-ink-mute bg-ink-mute/10',
}

export default function Invoices() {
  const { invoices } = useFinanceStore()
  const [filter, setFilter] = useState<'all' | 'sent' | 'paid' | 'overdue'>('all')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const sales = invoices.filter(inv => inv.type === 'sales')
  const filtered = filter === 'all' ? sales : sales.filter(inv => inv.status === filter)
  const total = filtered.reduce((sum, inv) => sum + inv.total, 0)

  const handleSave = (invoice: Invoice) => {
    addInvoice(invoice)
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm && (
        <NewInvoiceForm onClose={() => setShowForm(false)} onSave={handleSave} />
      )}
      {showImport && <ExcelImport onClose={() => setShowImport(false)} />}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['all', 'sent', 'overdue', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={'rounded px-3.5 py-1.5 text-xs transition-colors ' +
                (filter === f
                  ? 'bg-ink text-paper font-medium'
                  : 'border border-line text-ink-mute hover:text-ink')}
            >
              {f === 'all' ? 'Tümü' : statusLabel[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Excel'den Aktar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Yeni Fatura
          </button>
        </div>
      </div>

      {/* Invoice table */}
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-line bg-surface-2 px-5 py-3">
          {['Müşteri', 'Tarih', 'Vade', 'Tutar', 'Durum'].map(h => (
            <span key={h} className="label text-ink-mute">{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-ink-mute">
            Bu kategoride fatura yok
          </div>
        )}

        {filtered.map((inv, i) => (
          <div
            key={inv.id}
            className={'grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2 ' +
              (i < filtered.length - 1 ? 'border-b border-line' : '')}
          >
            <div>
              <div className="text-sm font-medium text-ink">{inv.contactName}</div>
              <div className="text-xs text-ink-mute">{inv.description}</div>
            </div>
            <span className="font-mono text-xs text-ink-mute">{inv.issueDate}</span>
            <span className={'font-mono text-xs ' + (inv.status === 'overdue' ? 'text-crimson' : 'text-ink-mute')}>{inv.dueDate}</span>
            <span className="font-mono text-sm font-medium text-ink">{fmt(inv.total)}</span>
            <div>
              <span className={'rounded px-2 py-1 text-xs font-medium ' + statusClass[inv.status]}>
                {statusLabel[inv.status]}
              </span>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 bg-surface-2 px-5 py-3.5">
          <span className="label col-span-3 text-ink-mute">Toplam ({filtered.length} fatura)</span>
          <span className="font-mono text-sm font-medium text-ink">{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}
