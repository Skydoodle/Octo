/* eslint-disable react-hooks/set-state-in-effect -- linked quotation summaries follow parent record */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSalesQuotes, getSalesQuoteVersion } from "../quoteRepository";
import type { SalesQuote, SalesQuoteVersion } from "../types";
import { formatQuoteCurrency, quoteStatusLabels } from "../quoteViewModel";
import { Badge, buttonPrimary, date } from "../../execution/ui/ExecutionUI";
export default function QuoteLinks({
  companyId,
  partyId,
  opportunityId,
  canWrite,
}: {
  companyId: string;
  partyId?: string;
  opportunityId?: string;
  canWrite: boolean;
}) {
  const [rows, setRows] = useState<
    Array<{ q: SalesQuote; v: SalesQuoteVersion | null }>
  >([]);
  const load = useCallback(async () => {
    const r = await listSalesQuotes(companyId, { partyId, opportunityId });
    if (r.error) return;
    const vs = await Promise.all(
      r.data
        .slice(0, 5)
        .map((q) =>
          q.currentVersionId
            ? getSalesQuoteVersion(companyId, q.currentVersionId)
            : Promise.resolve({ data: null, error: null }),
        ),
    );
    setRows(r.data.slice(0, 5).map((q, i) => ({ q, v: vs[i].data })));
  }, [companyId, partyId, opportunityId]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="rounded-card border border-line bg-surface p-5 md:p-7">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-serif text-xl">Teklifler</h2>
        {canWrite && (
          <Link
            className={buttonPrimary}
            to={`/dashboard/satis/teklifler/yeni?${opportunityId ? `opportunityId=${opportunityId}` : `partyId=${partyId}`}`}
          >
            Teklif oluştur
          </Link>
        )}
      </div>
      {!rows.length ? (
        <p className="mt-4 text-sm text-ink-soft">Bağlı teklif bulunmuyor.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map(({ q, v }) => (
            <Link
              key={q.id}
              to={`/dashboard/satis/teklifler/${q.id}`}
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-line p-3"
            >
              <span>
                <strong>{q.quoteNumber}</strong> ·{" "}
                <Badge>{quoteStatusLabels[q.status]}</Badge>
              </span>
              <span>
                {v
                  ? `v${v.versionNumber} · ${formatQuoteCurrency(v.grandTotal, q.currency)}`
                  : "—"}{" "}
                · {date(q.validUntil)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
