import type { CreateSalesInvoiceFromOrderInput, FinanceAccountCreateInput, FinanceCurrency, FinanceInvoiceTransitionInput, FinancePaymentMethod, RecordCustomerCollectionInput } from "./types";

const currencies:FinanceCurrency[]=["TRY","EUR","USD","GBP"];
const methods:FinancePaymentMethod[]=["bank_transfer","cash","card","cheque","other"];
const clean=(value:string|null|undefined)=>value?.trim()||null;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
export const normalizeIban=(value:string|null|undefined)=>clean(value)?.replace(/[^a-z0-9]/gi,"").toUpperCase()??null;
export function normalizeFinanceAccount(input:FinanceAccountCreateInput){
  const name=clean(input.name); const currency=input.currency?.toUpperCase() as FinanceCurrency; const iban=normalizeIban(input.iban); const openingBalance=input.openingBalance??0;
  if(!name)return {value:null,error:"Hesap adı gereklidir."};
  if(!["bank","cash"].includes(input.accountType))return {value:null,error:"Hesap türü geçersizdir."};
  if(!currencies.includes(currency))return {value:null,error:"Hesap para birimi desteklenmiyor."};
  if(iban&&(iban.length<15||iban.length>34))return {value:null,error:"IBAN biçimi geçersizdir."};
  if(!Number.isFinite(openingBalance))return {value:null,error:"Açılış bakiyesi geçersizdir."};
  return {value:{name,accountType:input.accountType,currency,iban,openingBalance},error:null};
}
export function normalizeInvoiceConversion(input:CreateSalesInvoiceFromOrderInput){
  const salesOrderId=clean(input.salesOrderId); const issueDate=input.issueDate??new Date().toISOString().slice(0,10); const dueDate=clean(input.dueDate);
  if(!salesOrderId)return {value:null,error:"Satış siparişi gereklidir."};
  if(!datePattern.test(issueDate)||!dueDate||!datePattern.test(dueDate)||dueDate<issueDate)return {value:null,error:"Vade tarihi düzenleme tarihinden önce olamaz."};
  return {value:{salesOrderId,issueDate,dueDate,customerNote:clean(input.customerNote),internalNote:clean(input.internalNote)},error:null};
}
export function normalizeInvoiceTransition(input:FinanceInvoiceTransitionInput){
  const invoiceId=clean(input.invoiceId); const reason=clean(input.reason);
  if(!invoiceId)return {value:null,error:"Fatura gereklidir."};
  if(!["issued","cancelled"].includes(input.destinationStatus))return {value:null,error:"Fatura durumu geçersizdir."};
  if(input.destinationStatus==="cancelled"&&!reason)return {value:null,error:"İptal nedeni gereklidir."};
  return {value:{invoiceId,destinationStatus:input.destinationStatus,reason},error:null};
}
export function normalizeCustomerCollection(input:RecordCustomerCollectionInput){
  const partyId=clean(input.partyId),accountId=clean(input.accountId); const paymentDate=clean(input.paymentDate);
  if(!partyId||!accountId)return {value:null,error:"Firma ve tahsilat hesabı gereklidir."};
  if(!paymentDate||!datePattern.test(paymentDate))return {value:null,error:"Tahsilat tarihi geçersizdir."};
  if(!methods.includes(input.paymentMethod))return {value:null,error:"Tahsilat yöntemi geçersizdir."};
  if(!input.allocations.length)return {value:null,error:"En az bir fatura tahsisatı gereklidir."};
  const normalized=input.allocations.map(x=>({invoiceId:clean(x.invoiceId)??"",allocatedAmount:x.allocatedAmount}));
  if(normalized.some(x=>!x.invoiceId||!Number.isFinite(x.allocatedAmount)||x.allocatedAmount<=0))return {value:null,error:"Tahsisat tutarları sıfırdan büyük olmalıdır."};
  if(new Set(normalized.map(x=>x.invoiceId)).size!==normalized.length)return {value:null,error:"Her fatura tahsilatta yalnız bir kez yer alabilir."};
  return {value:{partyId,accountId,paymentDate,paymentMethod:input.paymentMethod,externalReference:clean(input.externalReference),note:clean(input.note),allocations:normalized},error:null};
}
