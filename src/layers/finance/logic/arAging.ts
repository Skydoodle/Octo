import { Invoice } from '../types'

export interface ARAgingBucket {
  label: string
  invoices: Invoice[]
  total: number
}

export function calculateARAging(invoices: Invoice[]): ARAgingBucket[] {
  const today = new Date()

  const openSalesInvoices = invoices.filter(
    inv => inv.type === 'sales' && inv.status !== 'paid' && inv.status !== 'cancelled'
  )

  const buckets: ARAgingBucket[] = [
    { label: 'Vadesi gelmemiş', invoices: [], total: 0 },
    { label: '1-30 gün gecikmiş', invoices: [], total: 0 },
    { label: '31-60 gün gecikmiş', invoices: [], total: 0 },
    { label: '60+ gün gecikmiş', invoices: [], total: 0 },
  ]

  openSalesInvoices.forEach(inv => {
    const dueDate = new Date(inv.dueDate)
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysOverdue <= 0) {
      buckets[0].invoices.push(inv)
      buckets[0].total += inv.total
    } else if (daysOverdue <= 30) {
      buckets[1].invoices.push(inv)
      buckets[1].total += inv.total
    } else if (daysOverdue <= 60) {
      buckets[2].invoices.push(inv)
      buckets[2].total += inv.total
    } else {
      buckets[3].invoices.push(inv)
      buckets[3].total += inv.total
    }
  })

  return buckets
}

export function getTotalReceivables(invoices: Invoice[]): number {
  return invoices
    .filter(inv => inv.type === 'sales' && inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0)
}

export function getOverdueReceivables(invoices: Invoice[]): number {
  const today = new Date()
  return invoices
    .filter(inv => {
      if (inv.type !== 'sales' || inv.status === 'paid' || inv.status === 'cancelled') return false
      return new Date(inv.dueDate) < today
    })
    .reduce((sum, inv) => sum + inv.total, 0)
}