import { supabase } from "../../../lib/supabase";
import type {
  ConvertQuoteToOrderInput,
  ConvertQuoteToOrderResult,
  RecordFulfillmentInput,
  RecordFulfillmentResult,
  SalesOrder,
  SalesOrderFulfillment,
  SalesOrderFulfillmentItem,
  SalesOrderItem,
  SalesOrderListFilters,
  SalesOrderRepositoryError,
  SalesOrderRepositoryResult,
  SalesOrderStatusHistory,
  SalesOrderTransitionInput,
} from "./types";
import {
  normalizeFulfillment,
  normalizeOrderConversion,
  normalizeOrderTransition,
} from "./validation";

interface Response { data: unknown; error: unknown | null }
interface OrderQuery extends PromiseLike<Response> {
  select(columns: string): OrderQuery;
  eq(column: string, value: unknown): OrderQuery;
  is(column: string, value: null): OrderQuery;
  order(column: string, options?: { ascending?: boolean }): OrderQuery;
  maybeSingle(): PromiseLike<Response>;
}
interface OrderTable { select(columns: string): OrderQuery }
export interface SalesOrderDataClient {
  from(table: string): OrderTable;
  rpc(functionName: string, args: Record<string, unknown>): PromiseLike<Response>;
}
const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
const nullable = (value: unknown) => typeof value === "string" ? value : null;
const number = (value: unknown) => typeof value === "number" ? value : Number(value);

const mapOrder = (value: unknown): SalesOrder => {
  const row = record(value);
  return {
    id:String(row.id),companyId:String(row.company_id),orderNumber:String(row.order_number),sourceQuoteId:String(row.source_quote_id),sourceQuoteVersionId:String(row.source_quote_version_id),partyId:String(row.party_id),contactId:nullable(row.contact_id),opportunityId:nullable(row.opportunity_id),ownerUserId:String(row.owner_user_id),status:row.status as SalesOrder["status"],currency:row.currency as SalesOrder["currency"],orderDate:String(row.order_date),expectedDeliveryDate:nullable(row.expected_delivery_date),confirmedAt:nullable(row.confirmed_at),preparationStartedAt:nullable(row.preparation_started_at),completedAt:nullable(row.completed_at),cancelledAt:nullable(row.cancelled_at),cancellationReason:nullable(row.cancellation_reason),paymentTerms:nullable(row.payment_terms),deliveryTerms:nullable(row.delivery_terms),customerNotes:nullable(row.customer_notes),internalNotes:nullable(row.internal_notes),subtotal:number(row.subtotal),discountTotal:number(row.discount_total),taxTotal:number(row.tax_total),otherTaxTotal:number(row.other_tax_total),grandTotal:number(row.grand_total),totalCost:row.total_cost==null?null:number(row.total_cost),grossMargin:row.gross_margin==null?null:number(row.gross_margin),grossMarginPct:row.gross_margin_pct==null?null:number(row.gross_margin_pct),archivedAt:nullable(row.archived_at),createdBy:String(row.created_by),updatedBy:String(row.updated_by),createdAt:String(row.created_at),updatedAt:String(row.updated_at),
  };
};
const mapItem = (value: unknown): SalesOrderItem => {
  const row=record(value); return {id:String(row.id),companyId:String(row.company_id),salesOrderId:String(row.sales_order_id),sourceQuoteItemId:String(row.source_quote_item_id),position:number(row.position),itemCode:nullable(row.item_code),description:String(row.description),orderedQuantity:number(row.ordered_quantity),unit:String(row.unit),unitPrice:number(row.unit_price),discountType:row.discount_type as SalesOrderItem["discountType"],discountValue:number(row.discount_value),vatRate:number(row.vat_rate),otherTaxRate:number(row.other_tax_rate),lineSubtotal:number(row.line_subtotal),lineDiscount:number(row.line_discount),lineTax:number(row.line_tax),lineOtherTax:number(row.line_other_tax),lineTotal:number(row.line_total),unitCost:row.unit_cost==null?null:number(row.unit_cost),lineCost:row.line_cost==null?null:number(row.line_cost),lineMargin:row.line_margin==null?null:number(row.line_margin),lineMarginPct:row.line_margin_pct==null?null:number(row.line_margin_pct),createdAt:String(row.created_at)};
};
const mapFulfillment = (value: unknown): SalesOrderFulfillment => {
  const row=record(value); return {id:String(row.id),companyId:String(row.company_id),salesOrderId:String(row.sales_order_id),fulfillmentNumber:number(row.fulfillment_number),fulfilledAt:String(row.fulfilled_at),deliveryReference:nullable(row.delivery_reference),note:nullable(row.note),createdBy:String(row.created_by),createdAt:String(row.created_at)};
};
const mapFulfillmentItem = (value: unknown): SalesOrderFulfillmentItem => {
  const row=record(value); return {id:String(row.id),companyId:String(row.company_id),fulfillmentId:String(row.fulfillment_id),salesOrderItemId:String(row.sales_order_item_id),fulfilledQuantity:number(row.fulfilled_quantity),createdAt:String(row.created_at)};
};
const mapHistory = (value: unknown): SalesOrderStatusHistory => {
  const row=record(value); return {id:String(row.id),companyId:String(row.company_id),salesOrderId:String(row.sales_order_id),fromStatus:row.from_status as SalesOrderStatusHistory["fromStatus"],toStatus:row.to_status as SalesOrderStatusHistory["toStatus"],changedBy:String(row.changed_by),changedAt:String(row.changed_at),reason:nullable(row.reason)};
};

export function mapSalesOrderError(error: unknown): SalesOrderRepositoryError {
  const row=record(error); const code=String(row.code??""); const message=String(row.message??"").toLowerCase();
  if(code==="42501"||code==="PGRST301") return {code:"forbidden",message:"Bu satış siparişi işlemi için şirket yetkiniz bulunmuyor.",cause:error};
  if(code==="PGRST116"||code==="P0002") return {code:"not_found",message:"Satış siparişi bulunamadı.",cause:error};
  if(code==="23505"&&message.includes("quote")) return {code:"conflict",message:"Bu kabul edilmiş teklif için satış siparişi zaten oluşturulmuş.",cause:error};
  if(["23505","23514","22023"].includes(code)) return {code:"conflict",message:"Satış siparişi işlemi mevcut kurallarla çelişiyor. Durumu ve miktarları kontrol edin.",cause:error};
  return {code:"database",message:"Satış siparişi işlemi tamamlanamadı. Lütfen yeniden deneyin.",cause:error};
}
const invalid=<T>(message:string):SalesOrderRepositoryResult<T>=>({data:null,error:{code:"validation",message,cause:null}});

export function createSalesOrderRepository(client:SalesOrderDataClient){
  async function list<T>(table:string,companyId:string,mapper:(value:unknown)=>T,configure?:(query:OrderQuery)=>OrderQuery):Promise<SalesOrderRepositoryResult<T[]>>{
    let query=client.from(table).select("*").eq("company_id",companyId); if(configure) query=configure(query); const {data,error}=await query;
    return error?{data:null,error:mapSalesOrderError(error)}:{data:(Array.isArray(data)?data:[]).map(mapper),error:null};
  }
  async function one<T>(table:string,companyId:string,id:string,mapper:(value:unknown)=>T):Promise<SalesOrderRepositoryResult<T>>{
    const {data,error}=await client.from(table).select("*").eq("company_id",companyId).eq("id",id).maybeSingle();
    return error?{data:null,error:mapSalesOrderError(error)}:data?{data:mapper(data),error:null}:{data:null,error:{code:"not_found",message:"Satış siparişi bulunamadı.",cause:null}};
  }
  return {
    listSalesOrders(companyId:string,filters:SalesOrderListFilters={}):Promise<SalesOrderRepositoryResult<SalesOrder[]>>{
      return list("sales_orders",companyId,mapOrder,q=>{let scoped=q;if(!filters.includeArchived)scoped=scoped.is("archived_at",null);if(filters.status)scoped=scoped.eq("status",filters.status);if(filters.partyId)scoped=scoped.eq("party_id",filters.partyId);if(filters.opportunityId)scoped=scoped.eq("opportunity_id",filters.opportunityId);if(filters.ownerUserId)scoped=scoped.eq("owner_user_id",filters.ownerUserId);if(filters.sourceQuoteId)scoped=scoped.eq("source_quote_id",filters.sourceQuoteId);return scoped.order("updated_at",{ascending:false});});
    },
    getSalesOrder:(companyId:string,salesOrderId:string)=>one("sales_orders",companyId,salesOrderId,mapOrder),
    async getSalesOrderForQuote(companyId:string,quoteId:string):Promise<SalesOrderRepositoryResult<SalesOrder|null>>{
      const {data,error}=await client.from("sales_orders").select("*").eq("company_id",companyId).eq("source_quote_id",quoteId).maybeSingle();
      return error?{data:null,error:mapSalesOrderError(error)}:{data:data?mapOrder(data):null,error:null};
    },
    listSalesOrderItems:(companyId:string,salesOrderId:string)=>list("sales_order_items",companyId,mapItem,q=>q.eq("sales_order_id",salesOrderId).order("position",{ascending:true})),
    listSalesOrderFulfillments:(companyId:string,salesOrderId:string)=>list("sales_order_fulfillments",companyId,mapFulfillment,q=>q.eq("sales_order_id",salesOrderId).order("fulfillment_number",{ascending:true})),
    listSalesOrderFulfillmentItems:(companyId:string,fulfillmentId:string)=>list("sales_order_fulfillment_items",companyId,mapFulfillmentItem,q=>q.eq("fulfillment_id",fulfillmentId)),
    listSalesOrderStatusHistory:(companyId:string,salesOrderId:string)=>list("sales_order_status_history",companyId,mapHistory,q=>q.eq("sales_order_id",salesOrderId).order("changed_at",{ascending:true})),
    async convertAcceptedQuoteToSalesOrder(companyId:string,input:ConvertQuoteToOrderInput):Promise<SalesOrderRepositoryResult<ConvertQuoteToOrderResult>>{
      const checked=normalizeOrderConversion(input);if(!checked.value)return invalid(checked.error!);const value=checked.value;
      const {data,error}=await client.rpc("convert_accepted_quote_to_sales_order",{target_company_id:companyId,accepted_quote_id:value.quoteId,requested_order_date:value.orderDate??new Date().toISOString().slice(0,10),requested_expected_delivery_date:value.expectedDeliveryDate??null,requested_internal_note:value.internalNote??null});
      if(error)return {data:null,error:mapSalesOrderError(error)};const row=record(Array.isArray(data)?data[0]:data);return {data:{salesOrderId:String(row.sales_order_id),salesOrderNumber:String(row.sales_order_number),message:"Satış siparişi başarıyla oluşturuldu."},error:null};
    },
    async transitionSalesOrderStatus(companyId:string,input:SalesOrderTransitionInput):Promise<SalesOrderRepositoryResult<SalesOrder>>{
      const checked=normalizeOrderTransition(input);if(!checked.value)return invalid(checked.error!);const {data,error}=await client.rpc("transition_sales_order_status",{target_company_id:companyId,target_sales_order_id:checked.value.salesOrderId,destination_status:checked.value.destinationStatus,transition_reason:checked.value.reason??null});return error?{data:null,error:mapSalesOrderError(error)}:{data:mapOrder(data),error:null};
    },
    async recordSalesOrderFulfillment(companyId:string,input:RecordFulfillmentInput):Promise<SalesOrderRepositoryResult<RecordFulfillmentResult>>{
      const checked=normalizeFulfillment(input);if(!checked.value)return invalid(checked.error!);const value=checked.value;
      const {data,error}=await client.rpc("record_sales_order_fulfillment",{target_company_id:companyId,target_sales_order_id:value.salesOrderId,requested_fulfilled_at:value.fulfilledAt??new Date().toISOString(),requested_delivery_reference:value.deliveryReference??null,requested_note:value.note??null,fulfilled_items:value.items.map(item=>({sales_order_item_id:item.salesOrderItemId,fulfilled_quantity:item.fulfilledQuantity}))});
      if(error)return {data:null,error:mapSalesOrderError(error)};const row=record(Array.isArray(data)?data[0]:data);return {data:{fulfillmentId:String(row.fulfillment_id),fulfillmentNumber:number(row.fulfillment_number),resultingStatus:row.resulting_status as RecordFulfillmentResult["resultingStatus"]},error:null};
    },
    async archiveSalesOrder(companyId:string,salesOrderId:string):Promise<SalesOrderRepositoryResult<SalesOrder>>{
      const {data,error}=await client.rpc("archive_sales_order",{target_company_id:companyId,target_sales_order_id:salesOrderId});return error?{data:null,error:mapSalesOrderError(error)}:{data:mapOrder(data),error:null};
    },
  };
}

const repository=createSalesOrderRepository(supabase as unknown as SalesOrderDataClient);
export const listSalesOrders=repository.listSalesOrders;
export const getSalesOrder=repository.getSalesOrder;
export const getSalesOrderForQuote=repository.getSalesOrderForQuote;
export const listSalesOrderItems=repository.listSalesOrderItems;
export const listSalesOrderFulfillments=repository.listSalesOrderFulfillments;
export const listSalesOrderFulfillmentItems=repository.listSalesOrderFulfillmentItems;
export const listSalesOrderStatusHistory=repository.listSalesOrderStatusHistory;
export const convertAcceptedQuoteToSalesOrder=repository.convertAcceptedQuoteToSalesOrder;
export const transitionSalesOrderStatus=repository.transitionSalesOrderStatus;
export const recordSalesOrderFulfillment=repository.recordSalesOrderFulfillment;
export const archiveSalesOrder=repository.archiveSalesOrder;
