import type { SalesOrder, SalesOrderStatus } from "./types";

export const salesOrderStatusLabels: Record<SalesOrderStatus, string> = {
  draft: "Taslak",
  confirmed: "Onaylandı",
  in_preparation: "Hazırlanıyor",
  partially_fulfilled: "Kısmen karşılandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};
export const orderedQuantity = (amount: number) => Math.max(0, amount);
export const fulfilledQuantity = (amounts: number[]) =>
  amounts.reduce((total, amount) => total + Math.max(0, amount), 0);
export const remainingQuantity = (ordered: number, fulfilled: number) =>
  Math.max(0, orderedQuantity(ordered) - Math.max(0, fulfilled));
export const fulfillmentPercentage = (ordered: number, fulfilled: number) =>
  ordered > 0 ? Math.min(100, (Math.max(0, fulfilled) / ordered) * 100) : 0;
export const fulfillmentState = (ordered: number, fulfilled: number) =>
  fulfilled <= 0
    ? "unfulfilled"
    : fulfilled < ordered
      ? "partially_fulfilled"
      : "fully_fulfilled";
export const isSalesOrderTerminal = (status: SalesOrderStatus) =>
  status === "completed" || status === "cancelled";
export const isSalesOrderOpen = (status: SalesOrderStatus) =>
  !isSalesOrderTerminal(status);
export function daysUntilExpectedDelivery(
  value: string | null,
  now = new Date(),
) {
  if (!value) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil(
    (new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86_400_000,
  );
}
export const isDeliveryOverdue = (
  order: Pick<SalesOrder, "expectedDeliveryDate" | "status">,
  now = new Date(),
) =>
  isSalesOrderOpen(order.status) &&
  (daysUntilExpectedDelivery(order.expectedDeliveryDate, now) ?? 0) < 0;
export const formatOrderCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
export const salesOrderDisplayNumber = (orderNumber: string) =>
  orderNumber.trim().toUpperCase();

const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_preparation", "cancelled"],
  in_preparation: ["partially_fulfilled", "completed", "cancelled"],
  partially_fulfilled: ["partially_fulfilled", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};
export const mayTransitionSalesOrder = (
  from: SalesOrderStatus,
  to: SalesOrderStatus,
) => transitions[from].includes(to);
export const mayRecordFulfillment = (
  order: Pick<SalesOrder, "status" | "archivedAt">,
) =>
  !order.archivedAt &&
  ["confirmed", "in_preparation", "partially_fulfilled"].includes(order.status);
export const mayArchiveSalesOrder = (
  order: Pick<SalesOrder, "status" | "archivedAt">,
  fulfillmentCount = 0,
) => order.status === "draft" && !order.archivedAt && fulfillmentCount === 0;
