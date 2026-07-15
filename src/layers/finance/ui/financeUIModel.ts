import type { FinanceAccount, FinanceCurrency, FinanceInvoice, FinancePayment, ReceivableScheduleEntry } from "../core/types";
import { financeAccountBalance, invoicePaymentPercentage, isInvoiceOverdue } from "../core/financeCalculations";

export const financeCurrencies: FinanceCurrency[] = ["TRY", "EUR", "USD", "GBP"];
export const agingLabels = { current: "Güncel", "1_30": "1–30 gün gecikmiş", "31_60": "31–60 gün gecikmiş", "61_90": "61–90 gün gecikmiş", "90_plus": "90+ gün gecikmiş" } as const;
export const canWriteFinance = (role: string | null | undefined) => role === "owner" || role === "employee";
export const maskIban = (value: string | null) => !value ? "—" : value.length <= 8 ? "••••" : `${value.slice(0, 4)} •••• •••• ${value.slice(-4)}`;
export const maskTaxId = (value: string | null) => !value ? "—" : `${value.slice(0, 2)}${"•".repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;

export interface FinanceSnapshot { accounts: FinanceAccount[]; balances: Record<string, number>; invoices: FinanceInvoice[]; payments: FinancePayment[]; schedule: ReceivableScheduleEntry[] }
export interface CurrencyOverview { currency: FinanceCurrency; openReceivable: number; overdueReceivable: number; openInvoiceCount: number; dueWithin30Days: number; collectionsThisMonth: number; collectionCountThisMonth: number }

export function currencyOverview(snapshot: FinanceSnapshot, now = new Date()): CurrencyOverview[] {
  const month = now.toISOString().slice(0, 7);
  return financeCurrencies.flatMap(currency => {
    const schedule = snapshot.schedule.filter(row => row.currency === currency);
    const collections = snapshot.payments.filter(row => row.currency === currency && row.direction === "inflow" && row.paymentDate.startsWith(month));
    if (!schedule.length && !collections.length && !snapshot.accounts.some(row => row.currency === currency) && !snapshot.invoices.some(row => row.currency === currency)) return [];
    return [{ currency, openReceivable: schedule.reduce((sum, row) => sum + row.outstandingAmount, 0), overdueReceivable: schedule.filter(row => row.overdue).reduce((sum, row) => sum + row.outstandingAmount, 0), openInvoiceCount: schedule.length, dueWithin30Days: schedule.filter(row => !row.overdue && row.dueDate && new Date(`${row.dueDate}T00:00:00`).getTime() - now.getTime() <= 30 * 86_400_000).reduce((sum, row) => sum + row.outstandingAmount, 0), collectionsThisMonth: collections.reduce((sum, row) => sum + row.amount, 0), collectionCountThisMonth: collections.length }];
  });
}

export const accountRecordBalance = (account: FinanceAccount, payments: FinancePayment[]) => financeAccountBalance(account.openingBalance, payments.filter(row => row.accountId === account.id));
export const paymentPercentage = (invoice: FinanceInvoice) => invoicePaymentPercentage(invoice.grandTotal, invoice.paidAmount);
export const invoiceOverdue = (invoice: FinanceInvoice, now = new Date()) => isInvoiceOverdue(invoice, now);

export function productionFinanceCoverage(snapshot: FinanceSnapshot) {
  const hasAccount = snapshot.accounts.some(row => !row.archivedAt);
  const hasHistory = snapshot.invoices.length > 0 || snapshot.payments.length > 0;
  const missingDue = snapshot.invoices.some(row => ["issued", "partially_paid"].includes(row.status) && !row.dueDate);
  const currencies = new Set([...snapshot.invoices.map(row => row.currency), ...snapshot.accounts.map(row => row.currency)]);
  if (!hasAccount && !hasHistory) return { status: "missing" as const, explanation: "Supabase Finans kaydı bulunmuyor.", missingActions: ["En az bir Finans hesabı oluşturun."], availableCapabilities: [] as string[], blockedCapabilities: ["Doğrulanmış nakit pozisyonu", "Banka mutabakatı", "Gider ödeme takibi", "Borç takibi", "Nakit pisti"] };
  const partial = !hasAccount || !hasHistory || missingDue || currencies.size > 1;
  return { status: partial ? "partial" as const : "ready" as const, explanation: partial ? "Finans kayıtları kullanılabilir; bazı yetenekler veri veya kur kaynağı eksikliği nedeniyle sınırlı." : "Alacak, vade ve tahsilat kayıtları değerlendirilebilir.", missingActions: [!hasAccount ? "Aktif bir Finans hesabı oluşturun." : "", missingDue ? "Açık faturaların vade tarihlerini tamamlayın." : "", currencies.size > 1 ? "Dövizli kayıtlar için tarihli kur kaynağı ekleyin." : ""].filter(Boolean), availableCapabilities: ["Alacak takibi", "Vade takibi", "Gecikmiş alacak", "Tahsilat geçmişi", "Firma finansal bağlamı"], blockedCapabilities: ["Doğrulanmış nakit pozisyonu", "Banka mutabakatı", "Gider ödeme takibi", "Borç takibi", "Nakit pisti", ...(currencies.size > 1 ? ["Kur dönüşümü"] : [])] };
}
