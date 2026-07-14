import type { BusinessParty } from "../../crm/types";
import type {
  SalesOrder,
  SalesOrderFulfillmentItem,
  SalesOrderItem,
  SalesOrderStatus,
} from "../types";
import {
  fulfillmentPercentage,
  fulfillmentState,
  isDeliveryOverdue,
  remainingQuantity,
} from "../salesOrderViewModel";

export interface OrderFilters {
  search: string;
  status: string;
  owner: string;
  party: string;
  currency: string;
  orderFrom: string;
  orderTo: string;
  deliveryFrom: string;
  deliveryTo: string;
  overdue: boolean;
  fulfillment: string;
  archived: boolean;
}
export const emptyOrderFilters: OrderFilters = {
  search: "",
  status: "",
  owner: "",
  party: "",
  currency: "",
  orderFrom: "",
  orderTo: "",
  deliveryFrom: "",
  deliveryTo: "",
  overdue: false,
  fulfillment: "",
  archived: false,
};
export interface OrderProgress {
  ordered: number;
  fulfilled: number;
  remaining: number;
  percentage: number;
  remainingItems: number;
  state: "unfulfilled" | "partially_fulfilled" | "fully_fulfilled";
  byItem: Map<string, number>;
}
export function orderProgress(
  items: SalesOrderItem[],
  fulfilledItems: SalesOrderFulfillmentItem[],
): OrderProgress {
  const byItem = new Map<string, number>();
  fulfilledItems.forEach((item) =>
    byItem.set(
      item.salesOrderItemId,
      (byItem.get(item.salesOrderItemId) ?? 0) + item.fulfilledQuantity,
    ),
  );
  const ordered = items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const fulfilled = items.reduce(
    (sum, item) => sum + Math.min(item.orderedQuantity, byItem.get(item.id) ?? 0),
    0,
  );
  return {
    ordered,
    fulfilled,
    remaining: remainingQuantity(ordered, fulfilled),
    percentage: fulfillmentPercentage(ordered, fulfilled),
    remainingItems: items.filter(
      (item) => remainingQuantity(item.orderedQuantity, byItem.get(item.id) ?? 0) > 0,
    ).length,
    state: fulfillmentState(ordered, fulfilled),
    byItem,
  };
}
export function filterOrders(
  rows: SalesOrder[],
  progress: Map<string, OrderProgress>,
  parties: Map<string, BusinessParty>,
  filters: OrderFilters,
  now = new Date(),
) {
  const search = filters.search.trim().toLocaleLowerCase("tr-TR");
  return rows.filter((order) => {
    const orderProgressValue = progress.get(order.id);
    return (
      (filters.archived || !order.archivedAt) &&
      (!filters.status || order.status === filters.status) &&
      (!filters.owner || order.ownerUserId === filters.owner) &&
      (!filters.party || order.partyId === filters.party) &&
      (!filters.currency || order.currency === filters.currency) &&
      (!filters.orderFrom || order.orderDate >= filters.orderFrom) &&
      (!filters.orderTo || order.orderDate <= filters.orderTo) &&
      (!filters.deliveryFrom ||
        (!!order.expectedDeliveryDate &&
          order.expectedDeliveryDate >= filters.deliveryFrom)) &&
      (!filters.deliveryTo ||
        (!!order.expectedDeliveryDate &&
          order.expectedDeliveryDate <= filters.deliveryTo)) &&
      (!filters.overdue || isDeliveryOverdue(order, now)) &&
      (!filters.fulfillment || orderProgressValue?.state === filters.fulfillment) &&
      (!search ||
        order.orderNumber.toLocaleLowerCase("tr-TR").includes(search) ||
        (parties.get(order.partyId)?.displayName ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(search))
    );
  });
}
export const canWriteOrders = (role: string | null | undefined) =>
  role === "owner" || role === "employee";
export const canConvertQuoteToOrder = (
  quote: { status: string; archivedAt: string | null },
  hasOrder: boolean,
  role: string | null | undefined,
) =>
  quote.status === "accepted" &&
  !quote.archivedAt &&
  !hasOrder &&
  canWriteOrders(role);
export function explicitOrderActions(status: SalesOrderStatus) {
  if (status === "draft") return ["confirmed", "cancelled"] as SalesOrderStatus[];
  if (status === "confirmed")
    return ["in_preparation", "cancelled"] as SalesOrderStatus[];
  if (status === "in_preparation" || status === "partially_fulfilled")
    return ["cancelled"] as SalesOrderStatus[];
  return [];
}
