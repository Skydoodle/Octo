/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components -- provider and its hook share one private context */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCompanies } from "../../../company/companyContext";
import { getFinanceAccountBalance, listFinanceAccounts, listFinanceInvoices, listFinancePayments, listReceivableSchedule } from "../core/financeRepository";
import type { FinanceRepositoryError } from "../core/types";
import type { FinanceSnapshot } from "./financeUIModel";

interface Value { snapshot: FinanceSnapshot; loading: boolean; error: FinanceRepositoryError | null; reload: () => Promise<void> }
const empty: FinanceSnapshot = { accounts: [], balances: {}, invoices: [], payments: [], schedule: [] };
const Context = createContext<Value | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { activeCompany } = useCompanies();
  const [snapshot, setSnapshot] = useState(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<FinanceRepositoryError | null>(null);
  const reload = useCallback(async () => {
    if (!activeCompany) { setSnapshot(empty); setLoading(false); return; }
    setLoading(true); setError(null);
    const [accounts, invoices, payments, schedule] = await Promise.all([listFinanceAccounts(activeCompany.id), listFinanceInvoices(activeCompany.id), listFinancePayments(activeCompany.id), listReceivableSchedule(activeCompany.id)]);
    const failure = accounts.error ?? invoices.error ?? payments.error ?? schedule.error;
    if (failure) { setError(failure); setLoading(false); return; }
    const accountRows = accounts.data ?? []; const invoiceRows = invoices.data ?? []; const paymentRows = payments.data ?? []; const scheduleRows = schedule.data ?? [];
    const pairs = await Promise.all(accountRows.map(async account => [account.id, await getFinanceAccountBalance(activeCompany.id, account.id)] as const));
    const balanceFailure = pairs.find(([, result]) => result.error)?.[1].error;
    if (balanceFailure) { setError(balanceFailure); setLoading(false); return; }
    setSnapshot({ accounts: accountRows, invoices: invoiceRows, payments: paymentRows, schedule: scheduleRows, balances: Object.fromEntries(pairs.map(([id, result]) => [id, result.data ?? 0])) }); setLoading(false);
  }, [activeCompany]);
  useEffect(() => { void reload(); }, [reload]);
  const value = useMemo(() => ({ snapshot, loading, error, reload }), [snapshot, loading, error, reload]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useFinanceData() { const value = useContext(Context); if (!value) throw new Error("useFinanceData must be used within FinanceDataProvider."); return value; }
