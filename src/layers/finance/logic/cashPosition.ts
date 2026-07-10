import { BankAccount } from '../types'

export function calculateCashPosition(
  accounts: BankAccount[],
  baseCurrency: BankAccount['currency'] = 'TRY',
) {
  const sumCurrency = (currency: BankAccount['currency']) => accounts
    .filter(account => account.currency === currency && Number.isFinite(account.balance))
    .reduce((sum, account) => sum + account.balance, 0)
  const totalTRY = accounts
    .filter(account => account.currency === 'TRY' && Number.isFinite(account.balance))
    .reduce((sum, account) => sum + account.balance, 0)
  const totalUSD = sumCurrency('USD')
  const totalEUR = sumCurrency('EUR')

  // No fabricated FX conversion. `netCash` is the configured base-currency
  // position; all other balances remain separate nominal amounts.
  const netCash = sumCurrency(baseCurrency)

  return {
    netCash,
    totalTRY,
    totalUSD,
    totalEUR,
    baseCurrency,
    conversionMissing: accounts.some(account =>
      account.currency !== baseCurrency && Number.isFinite(account.balance) && account.balance !== 0,
    ),
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
