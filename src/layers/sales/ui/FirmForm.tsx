import { useState, type FormEvent } from 'react'
import type { BusinessParty, BusinessPartyCreateInput, BusinessPartyRoleName, BusinessPartyUpdateInput } from '../crm/types'
import { normalizePartyCreateInput, normalizePartyUpdateInput, BUSINESS_PARTY_ROLES } from '../crm/validation'
import { Field, buttonPrimary, buttonSecondary, inputClass } from './CRMUI'
import { roleLabels, statusLabels } from './salesViewModel'

interface Props {
  party?: BusinessParty
  saving: boolean
  serverError: string | null
  onCancel: () => void
  onCreate?: (input: BusinessPartyCreateInput) => void
  onUpdate?: (input: BusinessPartyUpdateInput) => void
}

const initial = (party?: BusinessParty) => ({
  displayName: party?.displayName ?? '', legalName: party?.legalName ?? '', taxId: party?.taxId ?? '', taxOffice: party?.taxOffice ?? '',
  mainPhone: party?.mainPhone ?? '', mainEmail: party?.mainEmail ?? '', website: party?.website ?? '', sector: party?.sector ?? '', city: party?.city ?? '',
  countryCode: party?.countryCode ?? 'TR', relationshipStatus: party?.relationshipStatus ?? 'potential', source: party?.source ?? '', address: party?.address ?? '', notes: party?.notes ?? '',
})

export default function FirmForm({ party, saving, serverError, onCancel, onCreate, onUpdate }: Props) {
  const [form, setForm] = useState(() => initial(party))
  const [roles, setRoles] = useState<BusinessPartyRoleName[]>(party?.roles ?? ['prospect'])
  const [error, setError] = useState<string | null>(null)
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (party) {
      const checked = normalizePartyUpdateInput(form)
      if (!checked.value) return setError(checked.error)
      onUpdate?.(checked.value)
    } else {
      const checked = normalizePartyCreateInput({ ...form, relationshipStatus: form.relationshipStatus as BusinessParty['relationshipStatus'], roles })
      if (!checked.value) return setError(checked.error)
      onCreate?.(checked.value)
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {(error || serverError) && <div role="alert" className="rounded-lg border border-crimson/25 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error || serverError}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Firma adı"><input className={inputClass} value={form.displayName} onChange={e => set('displayName', e.target.value)} required aria-required="true" /></Field>
        <Field label="Resmî unvan"><input className={inputClass} value={form.legalName} onChange={e => set('legalName', e.target.value)} /></Field>
        <Field label="VKN / TCKN"><input className={inputClass} value={form.taxId} onChange={e => set('taxId', e.target.value)} /></Field>
        <Field label="Vergi dairesi"><input className={inputClass} value={form.taxOffice} onChange={e => set('taxOffice', e.target.value)} /></Field>
        <Field label="Ana telefon"><input className={inputClass} value={form.mainPhone} onChange={e => set('mainPhone', e.target.value)} /></Field>
        <Field label="Ana e-posta"><input type="email" className={inputClass} value={form.mainEmail} onChange={e => set('mainEmail', e.target.value)} /></Field>
        <Field label="Web sitesi"><input className={inputClass} value={form.website} onChange={e => set('website', e.target.value)} /></Field>
        <Field label="Sektör"><input className={inputClass} value={form.sector} onChange={e => set('sector', e.target.value)} /></Field>
        <Field label="Şehir"><input className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} /></Field>
        <Field label="Ülke"><input className={inputClass} maxLength={2} value={form.countryCode} onChange={e => set('countryCode', e.target.value)} /></Field>
        <Field label="İlişki durumu"><select className={inputClass} value={form.relationshipStatus} onChange={e => set('relationshipStatus', e.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Kaynak"><input className={inputClass} value={form.source} onChange={e => set('source', e.target.value)} /></Field>
      </div>
      {!party && <fieldset><legend className="mb-2 text-sm font-medium text-ink">Roller (en az bir)</legend><div className="flex flex-wrap gap-2">{BUSINESS_PARTY_ROLES.map(role => <label key={role} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" checked={roles.includes(role)} onChange={() => setRoles(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role])} />{roleLabels[role]}</label>)}</div></fieldset>}
      <Field label="Adres"><textarea className={inputClass} rows={2} value={form.address} onChange={e => set('address', e.target.value)} /></Field>
      <Field label="Notlar"><textarea className={inputClass} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className={buttonSecondary}>Vazgeç</button><button type="submit" disabled={saving} className={buttonPrimary}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
    </form>
  )
}
