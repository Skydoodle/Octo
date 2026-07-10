export interface BankAccount {
  id: string
  name: string
  iban: string
  currency: 'TRY' | 'USD' | 'EUR'
  balance: number
}

export interface Invoice {
  id: string
  type: 'sales' | 'purchase'
  contactName: string
  contactTaxId: string
  amount: number
  vatAmount: number
  total: number
  vatRate: number
  currency: 'TRY' | 'USD' | 'EUR'
  issueDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  description: string
  // Exact cross-domain links. Optional fields are migration-safe for existing
  // persisted invoices and prevent heuristic obligation matching.
  sourceOrderId?: string
  obligationKey?: string
  externalRef?: string
  kdvDurumu?: 'normal' | 'tevkifat' | 'istisna'
  tevkifatOrani?: '2/10' | '3/10' | '4/10' | '5/10' | '7/10' | '9/10' | '10/10'
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  accountId: string
  invoiceId: string | null
}

export interface CashProjectionDay {
  date: string
  inflow: number
  outflow: number
  balance: number
}

export interface FinanceMetrics {
  netCash: number
  runwayMonths: number
  totalReceivables: number
  overdueReceivables: number
  totalPayables: number
  upcomingPayables: number
  monthlyRevenue: number
  monthlyExpenses: number
}
