import type {
  BusinessContactCreateInput,
  BusinessContactUpdateInput,
  BusinessPartyCreateInput,
  BusinessPartyRoleName,
  BusinessPartyUpdateInput,
} from './types'

export const BUSINESS_PARTY_ROLES: BusinessPartyRoleName[] = ['prospect', 'customer', 'supplier', 'partner', 'other']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed || null
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export function normalizeTaxId(value: string | null | undefined): string | null {
  const normalized = (value ?? '').toLocaleUpperCase('en-US').replace(/[^A-Z0-9]/g, '')
  return normalized || null
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = optionalText(value)?.toLocaleLowerCase('en-US') ?? null
  return normalized
}

export function isValidEmail(value: string | null): boolean {
  return value === null || emailPattern.test(value)
}

export function normalizeRoles(roles: readonly string[]): BusinessPartyRoleName[] | null {
  const normalized = [...new Set(roles.map(role => role.trim().toLocaleLowerCase('en-US')))]
  if (normalized.length === 0 || normalized.some(role => !BUSINESS_PARTY_ROLES.includes(role as BusinessPartyRoleName))) return null
  return normalized as BusinessPartyRoleName[]
}

export interface ValidatedInput<T> {
  value: T | null
  error: string | null
}

export function normalizePartyCreateInput(input: BusinessPartyCreateInput): ValidatedInput<BusinessPartyCreateInput> {
  const displayName = input.displayName.trim().replace(/\s+/g, ' ')
  const roles = normalizeRoles(input.roles)
  const mainEmail = normalizeEmail(input.mainEmail)
  const countryCode = (input.countryCode ?? 'TR').trim().toLocaleUpperCase('en-US')
  if (!displayName) return { value: null, error: 'İşletme adı boş bırakılamaz.' }
  if (!roles) return { value: null, error: 'En az bir geçerli ticari rol seçilmelidir.' }
  if (!isValidEmail(mainEmail)) return { value: null, error: 'Geçerli bir e-posta adresi girilmelidir.' }
  if (!/^[A-Z]{2}$/.test(countryCode)) return { value: null, error: 'Ülke kodu iki harften oluşmalıdır.' }
  return {
    error: null,
    value: {
      partyType: input.partyType ?? 'organization',
      displayName,
      legalName: optionalText(input.legalName),
      taxId: normalizeTaxId(input.taxId),
      taxOffice: optionalText(input.taxOffice),
      mainPhone: optionalText(input.mainPhone),
      mainEmail,
      website: optionalText(input.website),
      sector: optionalText(input.sector),
      city: optionalText(input.city),
      countryCode,
      address: optionalText(input.address),
      relationshipStatus: input.relationshipStatus ?? 'potential',
      source: optionalText(input.source),
      notes: optionalText(input.notes),
      roles,
    },
  }
}

export function normalizePartyUpdateInput(input: BusinessPartyUpdateInput): ValidatedInput<BusinessPartyUpdateInput> {
  const value: BusinessPartyUpdateInput = {}
  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim().replace(/\s+/g, ' ')
    if (!displayName) return { value: null, error: 'İşletme adı boş bırakılamaz.' }
    value.displayName = displayName
  }
  if (input.partyType !== undefined) value.partyType = input.partyType
  if (input.legalName !== undefined) value.legalName = optionalText(input.legalName)
  if (input.taxId !== undefined) value.taxId = normalizeTaxId(input.taxId)
  if (input.taxOffice !== undefined) value.taxOffice = optionalText(input.taxOffice)
  if (input.mainPhone !== undefined) value.mainPhone = optionalText(input.mainPhone)
  if (input.mainEmail !== undefined) {
    value.mainEmail = normalizeEmail(input.mainEmail)
    if (!isValidEmail(value.mainEmail)) return { value: null, error: 'Geçerli bir e-posta adresi girilmelidir.' }
  }
  if (input.website !== undefined) value.website = optionalText(input.website)
  if (input.sector !== undefined) value.sector = optionalText(input.sector)
  if (input.city !== undefined) value.city = optionalText(input.city)
  if (input.countryCode !== undefined) {
    value.countryCode = input.countryCode.trim().toLocaleUpperCase('en-US')
    if (!/^[A-Z]{2}$/.test(value.countryCode)) return { value: null, error: 'Ülke kodu iki harften oluşmalıdır.' }
  }
  if (input.address !== undefined) value.address = optionalText(input.address)
  if (input.relationshipStatus !== undefined) value.relationshipStatus = input.relationshipStatus
  if (input.source !== undefined) value.source = optionalText(input.source)
  if (input.notes !== undefined) value.notes = optionalText(input.notes)
  return { value, error: null }
}

export function normalizeContactCreateInput(input: BusinessContactCreateInput): ValidatedInput<BusinessContactCreateInput> {
  const firstName = input.firstName.trim().replace(/\s+/g, ' ')
  const email = normalizeEmail(input.email)
  if (!input.partyId) return { value: null, error: 'Ticari taraf kimliği gereklidir.' }
  if (!firstName) return { value: null, error: 'Ad boş bırakılamaz.' }
  if (!isValidEmail(email)) return { value: null, error: 'Geçerli bir e-posta adresi girilmelidir.' }
  return {
    error: null,
    value: {
      partyId: input.partyId,
      firstName,
      lastName: optionalText(input.lastName),
      jobTitle: optionalText(input.jobTitle),
      department: optionalText(input.department),
      email,
      phone: optionalText(input.phone),
      preferredChannel: input.preferredChannel ?? null,
      decisionRole: input.decisionRole ?? null,
      isPrimary: input.isPrimary ?? false,
      notes: optionalText(input.notes),
    },
  }
}

export function normalizeContactUpdateInput(input: BusinessContactUpdateInput): ValidatedInput<BusinessContactUpdateInput> {
  const value: BusinessContactUpdateInput = {}
  if (input.partyId !== undefined) value.partyId = input.partyId
  if (input.firstName !== undefined) {
    value.firstName = input.firstName.trim().replace(/\s+/g, ' ')
    if (!value.firstName) return { value: null, error: 'Ad boş bırakılamaz.' }
  }
  if (input.lastName !== undefined) value.lastName = optionalText(input.lastName)
  if (input.jobTitle !== undefined) value.jobTitle = optionalText(input.jobTitle)
  if (input.department !== undefined) value.department = optionalText(input.department)
  if (input.email !== undefined) {
    value.email = normalizeEmail(input.email)
    if (!isValidEmail(value.email)) return { value: null, error: 'Geçerli bir e-posta adresi girilmelidir.' }
  }
  if (input.phone !== undefined) value.phone = optionalText(input.phone)
  if (input.preferredChannel !== undefined) value.preferredChannel = input.preferredChannel
  if (input.decisionRole !== undefined) value.decisionRole = input.decisionRole
  if (input.isPrimary !== undefined) value.isPrimary = input.isPrimary
  if (input.notes !== undefined) value.notes = optionalText(input.notes)
  return { value, error: null }
}
