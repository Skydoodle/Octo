import {
  getSalesOrder,
  listSalesOrderFulfillmentItems,
  listSalesOrderFulfillments,
  listSalesOrderItems,
  listSalesOrderStatusHistory,
  listSalesOrders,
} from "../salesOrderRepository";
import type { SalesOrder, SalesOrderListFilters } from "../types";
import { orderProgress } from "./orderUIModel";

export async function loadOrderProgress(companyId: string, order: SalesOrder) {
  const [items, fulfillments] = await Promise.all([
    listSalesOrderItems(companyId, order.id),
    listSalesOrderFulfillments(companyId, order.id),
  ]);
  if (items.error || fulfillments.error)
    return { data: null, error: items.error ?? fulfillments.error };
  const fulfillmentItems = await Promise.all(
    fulfillments.data.map((fulfillment) =>
      listSalesOrderFulfillmentItems(companyId, fulfillment.id),
    ),
  );
  const failed = fulfillmentItems.find((result) => result.error)?.error;
  if (failed) return { data: null, error: failed };
  const allFulfillmentItems = fulfillmentItems.flatMap(
    (result) => result.data ?? [],
  );
  return {
    data: {
      order,
      items: items.data,
      fulfillments: fulfillments.data,
      fulfillmentItems: allFulfillmentItems,
      progress: orderProgress(items.data, allFulfillmentItems),
    },
    error: null,
  };
}

export async function loadOrdersWithProgress(
  companyId: string,
  filters: SalesOrderListFilters = {},
) {
  const orders = await listSalesOrders(companyId, filters);
  if (orders.error) return { data: null, error: orders.error };
  const bundles = await Promise.all(
    orders.data.map((order) => loadOrderProgress(companyId, order)),
  );
  const failed = bundles.find((result) => result.error)?.error;
  return failed
    ? { data: null, error: failed }
    : { data: bundles.flatMap((result) => (result.data ? [result.data] : [])), error: null };
}

export async function loadOrderDetail(companyId: string, orderId: string) {
  const order = await getSalesOrder(companyId, orderId);
  if (order.error) return { data: null, error: order.error };
  const [bundle, history] = await Promise.all([
    loadOrderProgress(companyId, order.data),
    listSalesOrderStatusHistory(companyId, orderId),
  ]);
  return bundle.error || history.error
    ? { data: null, error: bundle.error ?? history.error }
    : { data: { ...bundle.data!, history: history.data }, error: null };
}
