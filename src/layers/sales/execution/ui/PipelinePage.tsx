/* eslint-disable react-hooks/set-state-in-effect -- repository loads are intentionally started when company context changes */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCompanies } from "../../../../company/companyContext";
import Modal from "../../../../surfaces/dashboard/components/Modal";
import { listBusinessParties } from "../../crm/crmRepository";
import type { BusinessParty } from "../../crm/types";
import {
  getDefaultSalesPipeline,
  listOpportunityStageHistory,
  listSalesOpportunities,
  listSalesPipelineStages,
  moveSalesOpportunityStage,
} from "../salesExecutionRepository";
import {
  opportunityIsOverdue,
  opportunityIsStale,
  opportunityNeedsNextAction,
} from "../salesExecutionViewModel";
import type { SalesOpportunity, SalesPipelineStage } from "../types";
import {
  Badge,
  Notice,
  PageState,
  buttonPrimary,
  buttonSecondary,
  date,
  inputClass,
} from "./ExecutionUI";
import { canWriteExecution, money } from "./executionUIModel";

export default function PipelinePage() {
  const { activeCompany } = useCompanies();
  const canWrite = canWriteExecution(activeCompany?.role);
  const [rows, setRows] = useState<SalesOpportunity[]>([]);
  const [stages, setStages] = useState<SalesPipelineStage[]>([]);
  const [parties, setParties] = useState<BusinessParty[]>([]);
  const [entered, setEntered] = useState<Map<string, string>>(new Map());
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [moving, setMoving] = useState<{
    o: SalesOpportunity;
    stage: SalesPipelineStage;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [loss, setLoss] = useState("");
  const [next, setNext] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const load = useCallback(async () => {
    if (!activeCompany) return;
    const [pipeline, opps, firms] = await Promise.all([
      getDefaultSalesPipeline(activeCompany.id),
      listSalesOpportunities(activeCompany.id),
      listBusinessParties(activeCompany.id),
    ]);
    if (pipeline.error || opps.error) return setState("error");
    const s = await listSalesPipelineStages(activeCompany.id, pipeline.data.id);
    if (s.error) return setState("error");
    const histories = await Promise.all(
      opps.data.map((o) => listOpportunityStageHistory(activeCompany.id, o.id)),
    );
    setEntered(
      new Map(
        opps.data.map((o, i) => [
          o.id,
          histories[i].data?.[0]?.changedAt ?? o.createdAt,
        ]),
      ),
    );
    setRows(opps.data.filter((o) => o.pipelineId === pipeline.data.id));
    setStages(s.data);
    setParties(firms.data ?? []);
    setState("ready");
  }, [activeCompany]);
  useEffect(() => {
    void load();
  }, [load]);
  const names = useMemo(
    () => new Map(parties.map((p) => [p.id, p.displayName])),
    [parties],
  );
  const openMove = (o: SalesOpportunity, s: SalesPipelineStage) => {
    if (o.stageId === s.id) return;
    const current = stages.find((x) => x.id === o.stageId);
    if (current?.isClosed)
      return setNotice({
        text: "Kapalı fırsatlar V1’de yeniden açılamaz.",
        error: true,
      });
    setMoving({ o, stage: s });
    setNext(o.nextAction ?? "");
    setNextAt(o.nextActionAt?.slice(0, 16) ?? "");
    setReason("");
    setLoss("");
  };
  const move = async () => {
    if (!moving || !activeCompany) return;
    if (moving.stage.outcome === "lost" && !loss.trim())
      return setNotice({
        text: "Kaybedildi aşaması için kayıp nedeni gereklidir.",
        error: true,
      });
    setSaving(true);
    const r = await moveSalesOpportunityStage(activeCompany.id, {
      opportunityId: moving.o.id,
      destinationStageId: moving.stage.id,
      reason: reason || null,
      lossReason: loss || null,
      nextAction: next || null,
      nextActionAt: nextAt ? new Date(nextAt).toISOString() : null,
    });
    setSaving(false);
    if (r.error) return setNotice({ text: r.error.message, error: true });
    setMoving(null);
    setNotice({ text: "Fırsat aşaması güncellendi." });
    await load();
  };
  if (state === "loading")
    return (
      <main className="p-8">
        <PageState kind="loading" message="Pipeline yükleniyor…" />
      </main>
    );
  if (state === "error")
    return (
      <main className="p-8">
        <PageState
          kind="error"
          message="Pipeline yüklenemedi."
          retry={() => void load()}
        />
      </main>
    );
  return (
    <main className="space-y-5 px-4 py-6 md:px-8">
      <div>
        <h2 className="font-serif text-2xl">Pipeline</h2>
        <p className="text-sm text-ink-soft">
          Fırsatlar kayıtlı aşama sırasına göre gösterilir. Uyarılar
          deterministik kurallardır, AI değildir.
        </p>
      </div>
      {notice && <Notice error={notice.error}>{notice.text}</Notice>}
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        aria-label="Satış pipeline aşamaları"
      >
        {stages.map((stage) => (
          <section
            key={stage.id}
            className="w-[300px] shrink-0 rounded-card border border-line bg-surface-2 p-3"
            onDragOver={(e) => canWrite && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              const o = rows.find((x) => x.id === id);
              if (o) openMove(o, stage);
            }}
          >
            <header className="mb-3 flex justify-between">
              <h3 className="font-medium">{stage.name}</h3>
              <Badge muted>%{stage.defaultProbability}</Badge>
            </header>
            <div className="space-y-3">
              {rows
                .filter((o) => o.stageId === stage.id)
                .map((o) => {
                  const enteredAt = entered.get(o.id) ?? o.createdAt;
                  const days = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(enteredAt).getTime()) / 86400000,
                    ),
                  );
                  return (
                    <article
                      key={o.id}
                      draggable={canWrite && !stage.isClosed}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", o.id)
                      }
                      className="rounded-lg border border-line bg-surface p-4"
                    >
                      <Link
                        to={`/dashboard/satis/firsatlar/${o.id}`}
                        className="font-medium hover:text-crimson"
                      >
                        {o.title}
                      </Link>
                      <p className="text-sm text-crimson">
                        {names.get(o.partyId)}
                      </p>
                      <p className="mt-2 text-sm">
                        {money(o.expectedValue, o.currency)} ·{" "}
                        {date(o.expectedCloseDate)}
                      </p>
                      <p className="mt-1 text-xs text-ink-mute">
                        Sahibi: {o.ownerUserId ? "Ekip üyesi" : "—"}
                      </p>
                      <p className="mt-1 text-xs text-ink-mute">
                        Aşamada {days} gün ·{" "}
                        {o.nextAction || "Sonraki eylem yok"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {opportunityNeedsNextAction(o, stage) && (
                          <Badge muted>Eylem eksik</Badge>
                        )}
                        {opportunityIsStale(enteredAt, stage) && (
                          <Badge muted>Durgun</Badge>
                        )}
                        {opportunityIsOverdue(o, stage) && (
                          <Badge muted>Gecikmiş</Badge>
                        )}
                      </div>
                      {canWrite && !stage.isClosed && (
                        <label className="mt-3 block text-xs">
                          Aşamayı değiştir
                          <select
                            aria-label={`${o.title} aşamasını değiştir`}
                            className={`${inputClass} mt-1`}
                            value=""
                            onChange={(e) => {
                              const s = stages.find(
                                (x) => x.id === e.target.value,
                              );
                              if (s) openMove(o, s);
                            }}
                          >
                            <option value="">Aşama seçin</option>
                            {stages
                              .filter((s) => s.id !== stage.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </article>
                  );
                })}
              {!rows.some((o) => o.stageId === stage.id) && (
                <p className="py-4 text-center text-xs text-ink-mute">
                  Bu aşamada fırsat yok.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      {!canWrite && (
        <p className="text-xs text-ink-mute">Pipeline salt okunurdur.</p>
      )}
      {moving && (
        <Modal
          title="Fırsat aşamasını değiştir"
          onClose={() => setMoving(null)}
        >
          <div className="space-y-4">
            <p>
              <strong>{moving.o.title}</strong> → {moving.stage.name}
            </p>
            {moving.stage.outcome === "lost" && (
              <label className="block text-sm">
                Kayıp nedeni
                <textarea
                  required
                  className={`${inputClass} mt-1`}
                  value={loss}
                  onChange={(e) => setLoss(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm">
              Geçiş nedeni
              <textarea
                className={`${inputClass} mt-1`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Sonraki eylem
              <input
                className={`${inputClass} mt-1`}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Sonraki eylem tarihi
              <input
                type="datetime-local"
                className={`${inputClass} mt-1`}
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setMoving(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={saving}
                className={buttonPrimary}
                onClick={() => void move()}
              >
                {saving ? "Taşınıyor…" : "Aşamayı değiştir"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
