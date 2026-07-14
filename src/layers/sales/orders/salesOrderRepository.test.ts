import { describe, expect, it, vi } from "vitest";
import migration from "../../../../supabase/migrations/20260714140000_sales_orders_data_foundation_v1.sql?raw";
import {
  createSalesOrderRepository,
  mapSalesOrderError,
  type SalesOrderDataClient,
} from "./salesOrderRepository";
import {
  normalizeFulfillment,
  normalizeOrderConversion,
  normalizeOrderTransition,
} from "./validation";
import {
  daysUntilExpectedDelivery,
  fulfillmentPercentage,
  fulfillmentState,
  fulfilledQuantity,
  isDeliveryOverdue,
  isSalesOrderTerminal,
  mayArchiveSalesOrder,
  mayRecordFulfillment,
  mayTransitionSalesOrder,
  remainingQuantity,
  salesOrderStatusLabels,
} from "./salesOrderViewModel";
import type { SalesOrder } from "./types";

class Query implements PromiseLike<{ data: unknown; error: unknown | null }> {
  ops: Array<[string, ...unknown[]]> = [];
  constructor(private response={data:[] as unknown,error:null as unknown|null}){}
  select(v:string){this.ops.push(["select",v]);return this}
  eq(a:string,b:unknown){this.ops.push(["eq",a,b]);return this}
  is(a:string,b:null){this.ops.push(["is",a,b]);return this}
  order(a:string,b?:{ascending?:boolean}){this.ops.push(["order",a,b]);return this}
  maybeSingle(){this.ops.push(["maybeSingle"]);return Promise.resolve(this.response)}
  then<A={data:unknown;error:unknown|null},B=never>(ok?:((v:{data:unknown;error:unknown|null})=>A|PromiseLike<A>)|null,bad?:((r:unknown)=>B|PromiseLike<B>)|null){return Promise.resolve(this.response).then(ok,bad)}
}
class Client {
  queries:Array<{table:string;query:Query}>=[];
  rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
    void args;
    return {
      data:name==="convert_accepted_quote_to_sales_order"?[{sales_order_id:"order-1",sales_order_number:"SS-2026-000001"}]:name==="record_sales_order_fulfillment"?[{fulfillment_id:"f-1",fulfillment_number:1,resulting_status:"partially_fulfilled"}]:orderRow,
      error:null,
    };
  });
  constructor(private responses:Array<{data:unknown;error:unknown|null}>=[]){}
  from(table:string){const query=new Query(this.responses.shift());this.queries.push({table,query});return query}
}
const orderRow={id:"order-1",company_id:"company-1",order_number:"SS-2026-000001",source_quote_id:"quote-1",source_quote_version_id:"version-1",party_id:"party-1",contact_id:null,opportunity_id:null,owner_user_id:"user-1",status:"draft",currency:"TRY",order_date:"2026-07-14",expected_delivery_date:null,confirmed_at:null,preparation_started_at:null,completed_at:null,cancelled_at:null,cancellation_reason:null,payment_terms:null,delivery_terms:null,customer_notes:null,internal_notes:null,subtotal:100,discount_total:0,tax_total:20,other_tax_total:0,grand_total:120,total_cost:null,gross_margin:null,gross_margin_pct:null,archived_at:null,created_by:"user-1",updated_by:"user-1",created_at:"2026-07-14",updated_at:"2026-07-14"};
const order=(overrides:Partial<SalesOrder>={}):SalesOrder=>({id:"order-1",companyId:"company-1",orderNumber:"SS-2026-000001",sourceQuoteId:"quote-1",sourceQuoteVersionId:"version-1",partyId:"party-1",contactId:null,opportunityId:null,ownerUserId:"user-1",status:"draft",currency:"TRY",orderDate:"2026-07-14",expectedDeliveryDate:null,confirmedAt:null,preparationStartedAt:null,completedAt:null,cancelledAt:null,cancellationReason:null,paymentTerms:null,deliveryTerms:null,customerNotes:null,internalNotes:null,subtotal:100,discountTotal:0,taxTotal:20,otherTaxTotal:0,grandTotal:120,totalCost:null,grossMargin:null,grossMarginPct:null,archivedAt:null,createdBy:"user-1",updatedBy:"user-1",createdAt:"2026-07-14",updatedAt:"2026-07-14",...overrides});

describe("sales order validation",()=>{
  it("requires an accepted quotation identity and valid delivery date",()=>{
    expect(normalizeOrderConversion({quoteId:""}).error).toContain("teklif");
    expect(normalizeOrderConversion({quoteId:"q",orderDate:"2026-07-14",expectedDeliveryDate:"2026-07-13"}).error).toContain("önce");
  });
  it("normalizes optional conversion text",()=>expect(normalizeOrderConversion({quoteId:" q ",internalNote:"  not  "}).value).toMatchObject({quoteId:"q",internalNote:"not"}));
  it("requires a cancellation reason",()=>expect(normalizeOrderTransition({salesOrderId:"o",destinationStatus:"cancelled"}).error).toContain("nedeni"));
  it("validates fulfillment items, positive quantities and duplicate rows",()=>{
    expect(normalizeFulfillment({salesOrderId:"o",items:[]}).error).toContain("kalemi");
    expect(normalizeFulfillment({salesOrderId:"o",items:[{salesOrderItemId:"i",fulfilledQuantity:0}]}).error).toContain("sıfırdan");
    expect(normalizeFulfillment({salesOrderId:"o",items:[{salesOrderItemId:"i",fulfilledQuantity:1},{salesOrderItemId:"i",fulfilledQuantity:1}]}).error).toContain("benzersiz");
  });
});

describe("sales order deterministic helpers",()=>{
  it("derives fulfilled, remaining and percentage values",()=>{
    expect(fulfilledQuantity([2,3])).toBe(5);expect(remainingQuantity(10,4)).toBe(6);expect(fulfillmentPercentage(8,2)).toBe(25);
  });
  it("classifies unfulfilled, partial and complete quantities",()=>{
    expect(fulfillmentState(10,0)).toBe("unfulfilled");expect(fulfillmentState(10,4)).toBe("partially_fulfilled");expect(fulfillmentState(10,10)).toBe("fully_fulfilled");
  });
  it("calculates delivery dates and overdue state",()=>{
    expect(daysUntilExpectedDelivery("2026-07-16",new Date("2026-07-14T08:00:00"))).toBe(2);
    expect(isDeliveryOverdue(order({status:"confirmed",expectedDeliveryDate:"2026-07-13"}),new Date("2026-07-14"))).toBe(true);
  });
  it("models terminal states, Turkish labels and transition rules",()=>{
    expect(isSalesOrderTerminal("completed")).toBe(true);expect(salesOrderStatusLabels.partially_fulfilled).toBe("Kısmen karşılandı");expect(mayTransitionSalesOrder("draft","confirmed")).toBe(true);expect(mayTransitionSalesOrder("completed","confirmed")).toBe(false);
  });
  it("allows fulfillment and archive only in safe states",()=>{
    expect(mayRecordFulfillment(order({status:"confirmed"}))).toBe(true);expect(mayRecordFulfillment(order({status:"cancelled"}))).toBe(false);expect(mayArchiveSalesOrder(order(),0)).toBe(true);expect(mayArchiveSalesOrder(order({status:"confirmed"}),0)).toBe(false);
  });
});

describe("sales order repository",()=>{
  it("scopes every list to company and excludes archives by default",async()=>{
    const client=new Client();await createSalesOrderRepository(client as unknown as SalesOrderDataClient).listSalesOrders("company-1");
    expect(client.queries[0].query.ops).toContainEqual(["eq","company_id","company-1"]);expect(client.queries[0].query.ops).toContainEqual(["is","archived_at",null]);
  });
  it("includes archived orders only explicitly",async()=>{
    const client=new Client();await createSalesOrderRepository(client as unknown as SalesOrderDataClient).listSalesOrders("company-1",{includeArchived:true});expect(client.queries[0].query.ops).not.toContainEqual(["is","archived_at",null]);
  });
  it("exposes the one linked order for an accepted quotation",async()=>{
    const client=new Client([{data:orderRow,error:null}]);const result=await createSalesOrderRepository(client as unknown as SalesOrderDataClient).getSalesOrderForQuote("company-1","quote-1");expect(result.data).toMatchObject({id:"order-1",orderNumber:"SS-2026-000001"});expect(client.queries[0].query.ops).toContainEqual(["eq","source_quote_id","quote-1"]);
  });
  it("uses atomic conversion without totals, items or opportunity mutations",async()=>{
    const client=new Client();const result=await createSalesOrderRepository(client as unknown as SalesOrderDataClient).convertAcceptedQuoteToSalesOrder("company-1",{quoteId:"quote-1"});
    expect(result.data).toEqual({salesOrderId:"order-1",salesOrderNumber:"SS-2026-000001",message:"Satış siparişi başarıyla oluşturuldu."});const payload=client.rpc.mock.calls[0][1];expect(payload).not.toHaveProperty("totals");expect(payload).not.toHaveProperty("items");expect(payload).not.toHaveProperty("opportunity_stage");
  });
  it("uses controlled transition, fulfillment and archive RPCs",async()=>{
    const client=new Client();const repo=createSalesOrderRepository(client as unknown as SalesOrderDataClient);await repo.transitionSalesOrderStatus("company-1",{salesOrderId:"order-1",destinationStatus:"confirmed"});await repo.recordSalesOrderFulfillment("company-1",{salesOrderId:"order-1",items:[{salesOrderItemId:"item-1",fulfilledQuantity:1}]});await repo.archiveSalesOrder("company-1","order-1");
    expect(client.rpc.mock.calls.map(call=>call[0])).toEqual(["transition_sales_order_status","record_sales_order_fulfillment","archive_sales_order"]);
  });
  it("maps duplicate, forbidden and raw errors safely",()=>{
    const duplicate={code:"23505",message:"source quote unique private detail"};expect(mapSalesOrderError(duplicate)).toEqual({code:"conflict",message:"Bu kabul edilmiş teklif için satış siparişi zaten oluşturulmuş.",cause:duplicate});expect(mapSalesOrderError({code:"42501"}).code).toBe("forbidden");
  });
});

describe("sales order migration contract",()=>{
  it("creates all six company-scoped tables",()=>{
    for(const table of ["sales_orders","sales_order_items","sales_order_fulfillments","sales_order_fulfillment_items","sales_order_status_history","sales_order_number_counters"])expect(migration).toContain(`create table public.${table}`);
  });
  it("generates company/year-scoped concurrency-safe order numbers",()=>{
    expect(migration).toContain("'SS-'||target_year::text||'-'||lpad(allocated_number::text,6,'0')");expect(migration).toContain("on conflict(company_id,calendar_year) do update");expect(migration).toContain("primary key (company_id, calendar_year)");
  });
  it("locks and validates an accepted, active, not-yet-converted quote",()=>{
    expect(migration).toContain("where q.id=accepted_quote_id and q.company_id=target_company_id for update");expect(migration).toContain("Only accepted quotations can be converted");expect(migration).toContain("Archived quotation cannot be converted");expect(migration).toContain("Accepted quotation already has a sales order");
  });
  it("requires the accepted current immutable version and exact relationships",()=>{
    expect(migration).toContain("v.id=quote_row.current_version_id");expect(migration).toContain("v.is_current for share");expect(migration).toContain("sales_orders_version_quote_company_fk");expect(migration).toContain("Sales order contact must belong to selected party");expect(migration).toContain("Sales order opportunity must belong to selected party");expect(migration).toContain("Sales order owner must be an active company member");
  });
  it("copies authoritative totals and every quote item without recalculation",()=>{
    for(const field of ["version_row.subtotal","version_row.discount_total","version_row.tax_total","version_row.other_tax_total","version_row.grand_total","version_row.total_cost","version_row.gross_margin","version_row.gross_margin_pct"])expect(migration).toContain(field);
    expect(migration).toContain("select target_company_id,created_order_id,qi.id,qi.position");expect(migration).not.toContain("calculated_subtotal");
  });
  it("makes snapshots, order items and fulfillment records immutable",()=>{
    expect(migration).toContain("Sales order commercial snapshot is immutable");expect(migration).toContain("Sales order items are immutable");expect(migration).toContain("Sales order fulfillments are append-only");expect(migration).toContain("Sales order history is append-only");
  });
  it("creates exactly one initial draft history row during atomic conversion",()=>{
    const conversion=migration.slice(migration.indexOf("create or replace function public.convert_accepted_quote_to_sales_order"),migration.indexOf("create or replace function public.sales_order_is_fully_fulfilled"));expect(conversion.match(/insert into public\.sales_order_status_history/g)).toHaveLength(1);expect(conversion).toContain("null,'draft',actor_id");
  });
  it("implements valid transitions, terminal states and cancellation reason",()=>{
    expect(migration).toContain("when 'draft' then destination_status in ('confirmed','cancelled')");expect(migration).toContain("when 'partially_fulfilled' then destination_status in ('completed','cancelled') else false");expect(migration).toContain("Cancellation reason is required");expect(migration).toContain("Sales order cannot complete before full fulfillment");
  });
  it("prevents duplicate history for no-op partially fulfilled transition",()=>expect(migration).toContain("order_row.status=destination_status and destination_status='partially_fulfilled' then return order_row"));
  it("validates partial and cumulative fulfillment atomically",()=>{
    expect(migration).toContain("jsonb_array_length(fulfilled_items)=0");expect(migration).toContain("for update");expect(migration).toContain("Fulfilled quantity exceeds ordered quantity");expect(migration).toContain("unique (fulfillment_id, sales_order_item_id)");expect(migration).toContain("Fulfillment item must belong to the same order and company");
  });
  it("serializes fulfillment numbering and completes only on full quantities",()=>{
    expect(migration).toContain("max(f.fulfillment_number),0)+1");expect(migration).toContain("public.sales_order_is_fully_fulfilled(order_row.id)");expect(migration).toContain("then 'completed' else 'partially_fulfilled'");
  });
  it("archives only active unfulfilled drafts",()=>{
    expect(migration).toContain("Fulfilled sales order cannot be archived");expect(migration).toContain("status='draft' and archived_at is null");expect(migration).toContain("Only an active draft sales order can be archived");
  });
  it("keeps accountants read-only, anonymous denied, hard deletes unavailable and companies isolated",()=>{
    expect(migration).toContain("grant select on table public.sales_orders");expect(migration).not.toMatch(/grant (insert|update|delete) on table public\.sales_orders/);expect(migration).toContain("from public,anon,authenticated");expect(migration).toContain("using(public.is_company_member(company_id))");expect(migration.match(/enable row level security/g)).toHaveLength(6);
  });
  it("has no invoice, Procurement, inventory, Finance or opportunity side effects",()=>{
    expect(migration).not.toMatch(/insert into public\.(invoices|purchase|inventory|stock|sales_opportunities)/i);expect(migration).not.toMatch(/cariStore|financeStore|procurement/i);
  });
});
