import type { FinanceInvoiceStatus, FinancePaymentMethod } from "./types";
export const financeInvoiceStatusLabels:Record<FinanceInvoiceStatus,string>={draft:"Taslak",issued:"Kesinleştirildi",partially_paid:"Kısmen ödendi",paid:"Ödendi",cancelled:"İptal edildi"};
export const financePaymentMethodLabels:Record<FinancePaymentMethod,string>={bank_transfer:"Banka havalesi",cash:"Nakit",card:"Kart",cheque:"Çek",other:"Diğer"};
export const formatFinanceCurrency=(amount:number,currency:string)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency}).format(amount);
export const financeDocumentDisplayNumber=(value:string)=>value.trim().toUpperCase();
