import { useState, type FormEvent } from "react";
import type { BusinessParty, BusinessContact } from "../../crm/types";
import type {
  SalesActivity,
  SalesActivityCreateInput,
  SalesActivityType,
  SalesActivityVisibility,
  SalesLead,
  SalesOpportunity,
} from "../types";
import { normalizeActivityInput } from "../validation";
import {
  Notice,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "./ExecutionUI";
const allowed: SalesActivityType[] = [
  "call",
  "meeting",
  "email",
  "message",
  "note",
  "task",
  "file_shared",
];
export default function ActivityForm({
  activity,
  userId,
  leads,
  parties,
  contacts,
  opportunities,
  fixedOpportunityId,
  saving,
  error,
  onCancel,
  onSave,
}: {
  activity?: SalesActivity;
  userId: string;
  leads: SalesLead[];
  parties: BusinessParty[];
  contacts: BusinessContact[];
  opportunities: SalesOpportunity[];
  fixedOpportunityId?: string;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (v: SalesActivityCreateInput) => void;
}) {
  const [f, setF] = useState({
    activityType: activity?.activityType ?? ("task" as SalesActivityType),
    leadId: activity?.leadId ?? "",
    partyId: activity?.partyId ?? "",
    contactId: activity?.contactId ?? "",
    opportunityId: fixedOpportunityId ?? activity?.opportunityId ?? "",
    title: activity?.title ?? "",
    description: activity?.description ?? "",
    outcome: activity?.outcome ?? "",
    activityAt:
      activity?.activityAt?.slice(0, 16) ??
      new Date().toISOString().slice(0, 16),
    dueAt: activity?.dueAt?.slice(0, 16) ?? "",
    nextAction: activity?.nextAction ?? "",
    nextActionAt: activity?.nextActionAt?.slice(0, 16) ?? "",
    visibility:
      activity?.visibility ?? ("sales_team" as SalesActivityVisibility),
    assignedTo: activity?.assignedTo ?? "",
  });
  const [validation, setValidation] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: SalesActivityCreateInput = {
      ...f,
      ownerUserId: userId,
      leadId: f.leadId || null,
      partyId: f.partyId || null,
      contactId: f.contactId || null,
      opportunityId: f.opportunityId || null,
      assignedTo: f.assignedTo || null,
      dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null,
      activityAt: new Date(f.activityAt).toISOString(),
      nextActionAt: f.nextActionAt
        ? new Date(f.nextActionAt).toISOString()
        : null,
    };
    const checked = normalizeActivityInput(input);
    if (!checked.value) return setValidation(checked.error);
    onSave(checked.value);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      {(validation || error) && <Notice error>{validation || error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Tür
          <select
            className={`${inputClass} mt-1`}
            value={f.activityType}
            onChange={(e) => set("activityType", e.target.value)}
          >
            {allowed.map((v) => (
              <option key={v} value={v}>
                {v === "task"
                  ? "Görev"
                  : v === "call"
                    ? "Arama"
                    : v === "meeting"
                      ? "Toplantı"
                      : v === "email"
                        ? "E-posta kaydı"
                        : v === "message"
                          ? "Mesaj kaydı"
                          : v === "note"
                            ? "Not"
                            : "Dosya paylaşıldı"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Başlık
          <input
            className={`${inputClass} mt-1`}
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Potansiyel müşteri
          <select
            className={`${inputClass} mt-1`}
            value={f.leadId}
            onChange={(e) => set("leadId", e.target.value)}
          >
            <option value="">Seçili değil</option>
            {leads.map((v) => (
              <option key={v.id} value={v.id}>
                {v.companyName || v.firstName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Firma
          <select
            className={`${inputClass} mt-1`}
            value={f.partyId}
            onChange={(e) => set("partyId", e.target.value)}
          >
            <option value="">Seçili değil</option>
            {parties.map((v) => (
              <option key={v.id} value={v.id}>
                {v.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Fırsat
          <select
            disabled={!!fixedOpportunityId}
            className={`${inputClass} mt-1`}
            value={f.opportunityId}
            onChange={(e) => set("opportunityId", e.target.value)}
          >
            <option value="">Seçili değil</option>
            {opportunities.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Kişi
          <select
            className={`${inputClass} mt-1`}
            value={f.contactId}
            onChange={(e) => set("contactId", e.target.value)}
          >
            <option value="">Seçili değil</option>
            {contacts
              .filter((c) => !f.partyId || c.partyId === f.partyId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.firstName} {v.lastName}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Aktivite tarihi
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={f.activityAt}
            onChange={(e) => set("activityAt", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Vade tarihi
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={f.dueAt}
            onChange={(e) => set("dueAt", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Görünürlük
          <select
            className={`${inputClass} mt-1`}
            value={f.visibility}
            onChange={(e) => set("visibility", e.target.value)}
          >
            <option value="company">Tüm şirket</option>
            <option value="sales_team">Satış ekibi</option>
            <option value="private">Yalnızca ben</option>
          </select>
        </label>
        <label className="text-sm">
          Atanan kullanıcı
          <input
            disabled
            className={`${inputClass} mt-1`}
            value={f.assignedTo ? "Siz" : "Atanmamış"}
          />
          <span className="mt-1 block text-xs text-ink-mute">
            V1’de görev kendinize atanabilir.
          </span>
          <input
            type="checkbox"
            checked={f.assignedTo === userId}
            onChange={(e) => set("assignedTo", e.target.checked ? userId : "")}
          />{" "}
          Kendime ata
        </label>
      </div>
      <label className="block text-sm">
        Açıklama
        <textarea
          className={`${inputClass} mt-1`}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Sonuç
          <input
            className={`${inputClass} mt-1`}
            value={f.outcome}
            onChange={(e) => set("outcome", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sonraki eylem
          <input
            className={`${inputClass} mt-1`}
            value={f.nextAction}
            onChange={(e) => set("nextAction", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sonraki eylem tarihi
          <input
            type="datetime-local"
            className={`${inputClass} mt-1`}
            value={f.nextActionAt}
            onChange={(e) => set("nextActionAt", e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-ink-mute">
        E-posta ve mesaj türleri yalnız aktivite kaydı oluşturur; dış iletişim
        gönderilmez.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonSecondary} onClick={onCancel}>
          Vazgeç
        </button>
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
