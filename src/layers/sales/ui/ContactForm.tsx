import { useState, type FormEvent } from 'react'
import type { BusinessContact, BusinessContactCreateInput, BusinessContactUpdateInput, BusinessParty } from '../crm/types'
import { normalizeContactCreateInput, normalizeContactUpdateInput } from '../crm/validation'
import { Field, buttonPrimary, buttonSecondary, inputClass } from './CRMUI'
import { channelLabels, decisionLabels } from './salesViewModel'

interface Props { contact?: BusinessContact; parties: BusinessParty[]; fixedPartyId?: string; saving: boolean; serverError: string | null; onCancel: () => void; onCreate?: (input: BusinessContactCreateInput) => void; onUpdate?: (input: BusinessContactUpdateInput) => void }

export default function ContactForm({ contact, parties, fixedPartyId, saving, serverError, onCancel, onCreate, onUpdate }: Props) {
  const [form, setForm] = useState({ partyId: fixedPartyId ?? contact?.partyId ?? '', firstName: contact?.firstName ?? '', lastName: contact?.lastName ?? '', jobTitle: contact?.jobTitle ?? '', department: contact?.department ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', preferredChannel: contact?.preferredChannel ?? '', decisionRole: contact?.decisionRole ?? '', isPrimary: contact?.isPrimary ?? false, notes: contact?.notes ?? '' })
  const [error, setError] = useState<string | null>(null)
  const set = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError(null)
    const input = { ...form, preferredChannel: form.preferredChannel || null, decisionRole: form.decisionRole || null } as BusinessContactCreateInput
    const checked = contact ? normalizeContactUpdateInput(input) : normalizeContactCreateInput(input)
    if (!checked.value) return setError(checked.error)
    if (contact) onUpdate?.(checked.value as BusinessContactUpdateInput); else onCreate?.(checked.value as BusinessContactCreateInput)
  }
  return <form onSubmit={submit} noValidate className="space-y-5">
    {(error || serverError) && <div role="alert" className="rounded-lg border border-crimson/25 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error || serverError}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Firma"><select className={inputClass} value={form.partyId} onChange={e => set('partyId', e.target.value)} disabled={Boolean(fixedPartyId || contact)} required><option value="">Firma seçin</option>{parties.filter(p => !p.archivedAt).map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select></Field>
      <Field label="Ad"><input className={inputClass} value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></Field>
      <Field label="Soyad"><input className={inputClass} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></Field>
      <Field label="Unvan"><input className={inputClass} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></Field>
      <Field label="Departman"><input className={inputClass} value={form.department} onChange={e => set('department', e.target.value)} /></Field>
      <Field label="E-posta"><input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} /></Field>
      <Field label="Telefon"><input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
      <Field label="Tercih edilen kanal"><select className={inputClass} value={form.preferredChannel} onChange={e => set('preferredChannel', e.target.value)}><option value="">Belirtilmedi</option>{Object.entries(channelLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Karar rolü"><select className={inputClass} value={form.decisionRole} onChange={e => set('decisionRole', e.target.value)}><option value="">Belirtilmedi</option>{Object.entries(decisionLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <label className="flex items-center gap-2 self-end rounded-lg border border-line px-3 py-2.5 text-sm text-ink"><input type="checkbox" checked={form.isPrimary} onChange={e => set('isPrimary', e.target.checked)} />Birincil kişi</label>
    </div>
    <Field label="Notlar"><textarea className={inputClass} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    <p className="text-xs text-ink-mute">Başka bir etkin birincil kişi varsa bu seçim değiştirilmez ve işlem güvenle durdurulur.</p>
    <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className={buttonSecondary}>Vazgeç</button><button type="submit" disabled={saving} className={buttonPrimary}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
  </form>
}
