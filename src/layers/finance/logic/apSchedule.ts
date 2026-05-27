import { Invoice } from '../types'

export interface APItem {
  invoice: Invoice
  daysUntilDue: number
  isOverdue: boolean
}

export function calculateAPSchedule(invoices: Invoice[]): APItem[] {
  const today = new Date()

  return invoices
    .filter(inv => inv.type === 'purchase' && inv.status !== 'paid' && inv.status !== 'cancelled')
    .map(inv => {
      const dueDate = new Date(inv.dueDate)
      const daysUntilDue = Math.floor(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        invoice: inv,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      }
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
}

export function getTotalPayables(invoices: Invoice[]): number {
  return invoices
    .filter(inv => inv.type === 'purchase' && inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0)
}

export function getUpcomingPayables(invoices: Invoice[], days = 30): number {
  const today = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  return invoices
    .filter(inv => {
      if (inv.type !== 'purchase' || inv.status === 'paid' || inv.status === 'cancelled') return false
      const due = new Date(inv.dueDate)
      return due >= today && due <= future
    })
    .reduce((sum, inv) => sum + inv.total, 0)
}