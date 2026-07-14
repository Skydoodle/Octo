/* eslint-disable react-hooks/set-state-in-effect -- linked order summaries follow the parent CRM record */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, date } from "../../execution/ui/ExecutionUI";
import { formatOrderCurrency, salesOrderStatusLabels } from "../salesOrderViewModel";
import { loadOrdersWithProgress } from "./orderUIData";

type Bundle = NonNullable<Awaited<ReturnType<typeof loadOrdersWithProgress>>["data"]>[number];
export default function OrderLinks({
  companyId,
  partyId,
  opportunityId,
}: {
  companyId: string;
  partyId?: string;
  opportunityId?: string;
}) {
  const [rows, setRows] = useState<Bundle[]>([]);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const result = await loadOrdersWithProgress(companyId, {
      partyId,
      opportunityId,
    });
    setFailed(!!result.error);
    setRows(result.data?.slice(0, 5) ?? []);
  }, [companyId, partyId, opportunityId]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="rounded-card border border-line bg-surface p-5 md:p-7">
      <h2 className="font-serif text-xl">Satış Siparişleri</h2>
      {failed ? (
        <p className="mt-4 text-sm text-crimson">Satış siparişleri yüklenemedi.</p>
      ) : !rows.length ? (
        <p className="mt-4 text-sm text-ink-soft">Bağlı satış siparişi bulunmuyor.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map(({ order, progress }) => (
            <Link
              key={order.id}
              to={`/dashboard/satis/satis-siparisleri/${order.id}`}
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-line p-3 hover:border-crimson/30"
            >
              <span>
                <strong>{order.orderNumber}</strong> ·{" "}
                <Badge>{salesOrderStatusLabels[order.status]}</Badge>
              </span>
              <span className="text-sm text-ink-soft">
                {formatOrderCurrency(order.grandTotal, order.currency)} ·{" "}
                {date(order.orderDate)} · Teslim {date(order.expectedDeliveryDate)} · %
                {Math.round(progress.percentage)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
