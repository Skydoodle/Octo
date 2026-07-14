import { describe, expect, it } from "vitest";
import appSource from "../../../../App.tsx?raw";
import salesLayoutSource from "../../ui/SalesLayout.tsx?raw";
import quotePageSource from "../../quotes/ui/QuotePages.tsx?raw";
import firmPageSource from "../../ui/FirmDetailPage.tsx?raw";
import opportunityPageSource from "../../execution/ui/OpportunityPages.tsx?raw";
import orderPageSource from "./OrderPages.tsx?raw";
import quoteOrderSource from "./QuoteOrderPanel.tsx?raw";
import orderLinksSource from "./OrderLinks.tsx?raw";
import { normalizeFulfillment } from "../validation";
import { canConvertQuoteToOrder, canWriteOrders, emptyOrderFilters, explicitOrderActions, filterOrders, orderProgress } from "./orderUIModel";
import { isDeliveryOverdue, salesOrderStatusLabels } from "../salesOrderViewModel";
import type { SalesOrder, SalesOrderFulfillmentItem, SalesOrderItem } from "../types";

const order = (changes: Partial<SalesOrder> = {}): SalesOrder => ({
  id:"order-1",companyId:"company-1",orderNumber:"SS-2026-000001",sourceQuoteId:"quote-1",sourceQuoteVersionId:"version-1",partyId:"party-1",contactId:null,opportunityId:null,ownerUserId:"user-1",status:"draft",currency:"TRY",orderDate:"2026-07-14",expectedDeliveryDate:"2026-07-20",confirmedAt:null,preparationStartedAt:null,completedAt:null,cancelledAt:null,cancellationReason:null,paymentTerms:null,deliveryTerms:null,customerNotes:null,internalNotes:null,subtotal:100,discountTotal:0,taxTotal:20,otherTaxTotal:0,grandTotal:120,totalCost:null,grossMargin:null,grossMarginPct:null,archivedAt:null,createdBy:"user-1",updatedBy:"user-1",createdAt:"2026-07-14T00:00:00Z",updatedAt:"2026-07-14T00:00:00Z",...changes,
});
const item = (id: string, quantity: number): SalesOrderItem => ({id,companyId:"company-1",salesOrderId:"order-1",sourceQuoteItemId:`quote-${id}`,position:1,itemCode:null,description:id,orderedQuantity:quantity,unit:"Adet",unitPrice:10,discountType:null,discountValue:0,vatRate:20,otherTaxRate:0,lineSubtotal:10,lineDiscount:0,lineTax:2,lineOtherTax:0,lineTotal:12,unitCost:null,lineCost:null,lineMargin:null,lineMarginPct:null,createdAt:"2026-07-14"});
const fulfilled = (id: string, itemId: string, quantity: number): SalesOrderFulfillmentItem => ({id,companyId:"company-1",fulfillmentId:"fulfillment-1",salesOrderItemId:itemId,fulfilledQuantity:quantity,createdAt:"2026-07-14"});

describe("sales order routes and navigation", () => {
  it("registers list and protected detail routes", () => { expect(appSource).toContain('path="satis-siparisleri"'); expect(appSource).toContain('path="satis-siparisleri/:orderId"'); });
  it("places Sales Orders after quotations", () => { expect(salesLayoutSource.indexOf("Satış Siparişleri")).toBeGreaterThan(salesLayoutSource.indexOf("Teklifler")); });
  it("does not add manual order, invoice, stock or procurement routes", () => { expect(appSource).not.toMatch(/satis-siparisleri\/yeni|satis-siparisleri\/fatura|satis-siparisleri\/stok|satis-siparisleri\/satinalma/); });
});

describe("sales order list", () => {
  it("has honest loading, error, empty and filtered-empty states", () => { for (const value of ["Satış siparişleri yükleniyor…","Satış siparişleri yüklenemedi.","Henüz satış siparişi bulunmuyor.","Filtrelerle eşleşen satış siparişi bulunamadı."]) expect(orderPageSource).toContain(value); });
  it("keeps accountants read-only", () => { expect(canWriteOrders("owner")).toBe(true); expect(canWriteOrders("employee")).toBe(true); expect(canWriteOrders("accountant")).toBe(false); expect(orderPageSource).toContain("Bu görünüm salt okunurdur."); });
  it("filters by order, firm, status and archived state", () => { const parties = new Map([["party-1", { displayName:"Örnek Firma" } as never]]); const progress = new Map([["order-1", orderProgress([item("item-1", 10)], [])]]); expect(filterOrders([order()], progress, parties, {...emptyOrderFilters,search:"örnek",status:"draft"})).toHaveLength(1); expect(filterOrders([order({archivedAt:"2026-07-15"})], progress, parties, emptyOrderFilters)).toHaveLength(0); });
  it("filters fulfillment state and delivery dates", () => { const progress = new Map([["order-1", orderProgress([item("item-1",10)],[fulfilled("f-1","item-1",4)])]]); expect(filterOrders([order()],progress,new Map(),{...emptyOrderFilters,fulfillment:"partially_fulfilled",deliveryFrom:"2026-07-19",deliveryTo:"2026-07-21"})).toHaveLength(1); });
  it("shows all formal status labels", () => { expect(salesOrderStatusLabels).toEqual({draft:"Taslak",confirmed:"Onaylandı",in_preparation:"Hazırlanıyor",partially_fulfilled:"Kısmen karşılandı",completed:"Tamamlandı",cancelled:"İptal edildi"}); });
  it("shows overdue delivery and progress", () => { expect(isDeliveryOverdue(order({status:"confirmed",expectedDeliveryDate:"2026-07-10"}),new Date("2026-07-14"))).toBe(true); expect(orderPageSource).toContain("Beklenen teslimat tarihi geçti."); expect(orderPageSource).toContain("bundle.progress.percentage"); });
});

describe("accepted quotation conversion", () => {
  const accepted = { status:"accepted", archivedAt:null };
  it("only permits eligible writers and prevents duplicate conversion", () => { expect(canConvertQuoteToOrder(accepted,false,"owner")).toBe(true); expect(canConvertQuoteToOrder(accepted,false,"employee")).toBe(true); expect(canConvertQuoteToOrder(accepted,false,"accountant")).toBe(false); expect(canConvertQuoteToOrder(accepted,true,"owner")).toBe(false); expect(canConvertQuoteToOrder({...accepted,status:"sent"},false,"owner")).toBe(false); });
  it("renders the required confirmation summary", () => { for (const label of ["Teklif","Firma","İlgili kişi","Fırsat","Sorumlu","Toplam","Kalem sayısı","Ödeme koşulları","Teslimat koşulları"]) expect(quoteOrderSource).toContain(label); });
  it("uses only the atomic conversion repository call", () => { expect(quoteOrderSource).toContain("convertAcceptedQuoteToSalesOrder(companyId"); expect(quoteOrderSource).not.toMatch(/grandTotal:|items:/); });
  it("shows the exact confirmed success and navigates to detail", () => { expect(quoteOrderSource).toContain("Satış siparişi başarıyla oluşturuldu."); expect(quoteOrderSource).toContain("/dashboard/satis/satis-siparisleri/${result.data.salesOrderId}"); });
  it("replaces conversion with the linked order", () => { expect(quoteOrderSource).toContain("getSalesOrderForQuote"); expect(quoteOrderSource).toContain("Siparişi aç"); expect(quotePageSource).toContain("<QuoteOrderPanel"); });
});

describe("order detail and status management", () => {
  it("shows loading and safe missing states", () => { expect(orderPageSource).toContain("Satış siparişi yükleniyor…"); expect(orderPageSource).toContain("Satış siparişi bulunamadı veya bu şirkette görüntülenemiyor."); });
  it("explains immutable snapshot and renders ordered, fulfilled and remaining quantities", () => { expect(orderPageSource).toContain("Bu sipariş, kabul edilen teklifin değiştirilemez ticari kopyasıdır."); for (const label of ["Sipariş","Karşılanan","Kalan"]) expect(orderPageSource).toContain(`label="${label}"`); });
  it("only exposes valid explicit actions", () => { expect(explicitOrderActions("draft")).toEqual(["confirmed","cancelled"]); expect(explicitOrderActions("confirmed")).toEqual(["in_preparation","cancelled"]); expect(explicitOrderActions("completed")).toEqual([]); expect(explicitOrderActions("cancelled")).toEqual([]); });
  it("uses the transition RPC wrapper for confirmation and preparation", () => { expect(orderPageSource).toContain('transition("confirmed")'); expect(orderPageSource).toContain('transition("in_preparation")'); expect(orderPageSource).toContain("transitionSalesOrderStatus"); });
  it("requires a cancellation reason and removes terminal mutation controls", () => { expect(orderPageSource).toContain("İptal nedeni gereklidir."); expect(orderPageSource).toContain('disabled={saving || !reason.trim()}'); expect(explicitOrderActions("completed")).toHaveLength(0); });
});

describe("fulfillment", () => {
  it("validates positive quantities", () => { expect(normalizeFulfillment({salesOrderId:"order-1",items:[{salesOrderItemId:"item-1",fulfilledQuantity:0}]}).error).toContain("sıfırdan büyük"); expect(orderPageSource).toContain("En az bir pozitif miktar girilmelidir."); });
  it("rejects amounts above remaining quantity", () => { expect(orderPageSource).toContain("Karşılanan miktar kalan miktarı aşamaz."); expect(orderPageSource).toContain("max={remaining}"); });
  it("tracks partial and multi-item fulfillment", () => { const progress = orderProgress([item("a",10),item("b",5)],[fulfilled("f1","a",4),fulfilled("f2","b",5)]); expect(progress.percentage).toBe(60); expect(progress.remainingItems).toBe(1); expect(progress.state).toBe("partially_fulfilled"); });
  it("tracks full completion", () => { const progress = orderProgress([item("a",10)],[fulfilled("f1","a",10)]); expect(progress.percentage).toBe(100); expect(progress.state).toBe("fully_fulfilled"); });
  it("uses the server result status and exact success notices", () => { expect(orderPageSource).toContain("result.data.resultingStatus"); expect(orderPageSource).toContain("Karşılama kaydı başarıyla oluşturuldu."); expect(orderPageSource).toContain("Sipariş tamamen karşılandı ve tamamlandı."); });
  it("renders append-only fulfillment and status histories", () => { expect(orderPageSource).toContain("Karşılama Geçmişi"); expect(orderPageSource).toContain("Durum Geçmişi"); expect(orderPageSource).toContain("düzenlenemez, silinemez veya geri alınamaz"); });
});

describe("integrations and boundaries", () => {
  it("adds firm and opportunity order links", () => { expect(firmPageSource).toContain("<OrderLinks"); expect(opportunityPageSource).toContain("<OrderLinks"); expect(orderLinksSource).toContain("Satış Siparişleri"); });
  it("links quotation, firm and opportunity from order detail", () => { expect(orderPageSource).toContain("Kaynak teklif"); expect(orderPageSource).toContain("/dashboard/satis/firmalar/"); expect(orderPageSource).toContain("/dashboard/satis/firsatlar/"); });
  it("contains no invoice creation, inventory, Procurement or Finance synchronization claims", () => { const sources = `${orderPageSource}${quoteOrderSource}${orderLinksSource}`; expect(sources).not.toMatch(/fatura oluştur|stok rezerv|satın alma gereksin|cariStore|Finance senkron/i); });
});
