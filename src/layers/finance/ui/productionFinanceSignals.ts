import type { ReasoningSignal } from "../../../reasoning/types";
import type { FinanceSnapshot } from "./financeUIModel";

export function buildProductionFinanceSignals(snapshot: FinanceSnapshot): ReasoningSignal[] {
  const supported = new Set(["TRY", "EUR", "USD"]);
  const invoiceSignals: ReasoningSignal[] = snapshot.invoices.flatMap(invoice => {
    if (!supported.has(invoice.currency) || invoice.archivedAt || !invoice.dueDate || invoice.outstandingAmount <= 0 || !["issued", "partially_paid"].includes(invoice.status)) return [];
    return [{ id:`finance:receivable:${invoice.id}`, domain:"finance", kind:"cash_inflow", label:`${invoice.invoiceNumber} beklenen tahsilat`, eventDate:invoice.dueDate, amount:invoice.outstandingAmount, currency:invoice.currency as "TRY"|"EUR"|"USD", entityId:invoice.partyId, confidence:"high", evidence:[{domain:"finance",recordType:"finance_invoice",recordId:invoice.id,label:"Kesinleşmiş açık alacak",value:String(invoice.outstandingAmount)}], obligation:{key:`finance-invoice:${invoice.id}`,category:"invoice_receivable",source:"recorded"}, metadata:{expected:true,verifiedStartingCash:false,status:invoice.status} } as ReasoningSignal];
  });
  const paymentSignals: ReasoningSignal[] = snapshot.payments.flatMap(payment => !supported.has(payment.currency)||payment.direction!=="inflow"?[]:[{id:`finance:collection:${payment.id}`,domain:"finance",kind:"cash_inflow",label:`${payment.paymentNumber} kaydedilen tahsilat`,eventDate:payment.paymentDate,amount:payment.amount,currency:payment.currency as "TRY"|"EUR"|"USD",entityId:payment.partyId,confidence:"high",evidence:[{domain:"finance",recordType:"finance_payment",recordId:payment.id,label:"Kaydedilmiş tahsilat",value:String(payment.amount)}],metadata:{historical:true,verifiedStartingCash:false}} as ReasoningSignal]);
  return [...invoiceSignals,...paymentSignals];
}

export const productionSignalsOnly=(legacy:ReasoningSignal[],snapshot:FinanceSnapshot)=>[...legacy.filter(signal=>signal.domain!=="finance"),...buildProductionFinanceSignals(snapshot)];
