import { BankAccount } from '../types'

export function calculateCashPosition(accounts: BankAccount[]) {
  const totalTRY = accounts
    .filter(a => a.currency === 'TRY')
    .reduce((sum, a) => sum + a.balance, 0)

  const totalUSD = accounts
    .filter(a => a.currency === 'USD')
    .reduce((sum, a) => sum + a.balance, 0)

  const totalUSDinTRY = totalUSD * 38.5 // approximate exchange rate

  const netCash = totalTRY + totalUSDinTRY

  return {
    netCash,
    totalTRY,
    totalUSD,
    totalUSDinTRY,
    accounts,
  }
}

export function calculateRunway(
  netCash: number,
  monthlyExpenses: number
): number {
  if (monthlyExpenses === 0) return 999
  return Math.round((netCash / monthlyExpenses) * 10) / 10
}

export function calculateMonthlyExpenses(
  transactions: { amount: number; type: string; date: string }[]
): number {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyExpenses = transactions
    .filter(tx => {
      const txDate = new Date(tx.date)
      return (
        tx.type === 'expense' &&
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  return monthlyExpenses
}