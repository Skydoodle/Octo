import { supabase } from '../../../lib/supabase'
import type {
  BusinessContact,
  BusinessContactCreateInput,
  BusinessContactFilters,
  BusinessContactUpdateInput,
  BusinessParty,
  BusinessPartyCreateInput,
  BusinessPartyFilters,
  BusinessPartyRoleName,
  BusinessPartyUpdateInput,
  CRMRepositoryError,
  CRMRepositoryResult,
} from './types'
import {
  normalizeContactCreateInput,
  normalizeContactUpdateInput,
  normalizeName,
  normalizePartyCreateInput,
  normalizePartyUpdateInput,
  normalizeRoles,
} from './validation'

interface DatabaseResponse {
  data: unknown
  error: unknown | null
}

interface CRMQuery extends PromiseLike<DatabaseResponse> {
  select(columns: string): CRMQuery
  eq(column: string, value: unknown): CRMQuery
  is(column: string, value: null): CRMQuery
  ilike(column: string, value: string): CRMQuery
  order(column: string, options?: { ascending?: boolean }): CRMQuery
  maybeSingle(): PromiseLike<DatabaseResponse>
}

interface CRMTable {
  select(columns: string): CRMQuery
  insert(values: Record<string, unknown>): CRMQuery
  update(values: Record<string, unknown>): CRMQuery
}

export interface CRMDataClient {
  from(table: string): CRMTable
  rpc(functionName: string, args: Record<string, unknown>): PromiseLike<DatabaseResponse>
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function mapBusinessParty(value: unknown): BusinessParty {
  const row = record(value)
  const nestedRoles = Array.isArray(row.business_party_roles) ? row.business_party_roles : []
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    partyType: row.party_type as BusinessParty['partyType'],
    displayName: String(row.display_name),
    legalName: stringOrNull(row.legal_name),
    taxId: stringOrNull(row.tax_id),
    taxOffice: stringOrNull(row.tax_office),
    mainPhone: stringOrNull(row.main_phone),
    mainEmail: stringOrNull(row.main_email),
    website: stringOrNull(row.website),
    sector: stringOrNull(row.sector),
    city: stringOrNull(row.city),
    countryCode: String(row.country_code),
    address: stringOrNull(row.address),
    relationshipStatus: row.relationship_status as BusinessParty['relationshipStatus'],
    source: stringOrNull(row.source),
    notes: stringOrNull(row.notes),
    normalizedName: String(row.normalized_name),
    normalizedTaxId: stringOrNull(row.normalized_tax_id),
    archivedAt: stringOrNull(row.archived_at),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    roles: nestedRoles.map(item => record(item).role).filter((role): role is BusinessPartyRoleName => typeof role === 'string') as BusinessPartyRoleName[],
  }
}

function mapBusinessContact(value: unknown): BusinessContact {
  const row = record(value)
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    partyId: String(row.party_id),
    firstName: String(row.first_name),
    lastName: stringOrNull(row.last_name),
    jobTitle: stringOrNull(row.job_title),
    department: stringOrNull(row.department),
    email: stringOrNull(row.email),
    phone: stringOrNull(row.phone),
    preferredChannel: row.preferred_channel as BusinessContact['preferredChannel'],
    decisionRole: row.decision_role as BusinessContact['decisionRole'],
    isPrimary: Boolean(row.is_primary),
    notes: stringOrNull(row.notes),
    archivedAt: stringOrNull(row.archived_at),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function errorFields(error: unknown): { code: string; message: string; constraint: string } {
  const value = record(error)
  return {
    code: typeof value.code === 'string' ? value.code : '',
    message: typeof value.message === 'string' ? value.message : '',
    constraint: typeof value.constraint === 'string' ? value.constraint : '',
  }
}

export function mapCRMError(error: unknown): CRMRepositoryError {
  const fields = errorFields(error)
  const lowerMessage = fields.message.toLocaleLowerCase('en-US')
  if (fields.code === '23505' && (fields.constraint === 'business_parties_active_tax_id_unique' || lowerMessage.includes('tax id'))) {
    return { code: 'duplicate_tax_id', message: 'Bu vergi kimliğiyle aktif bir ticari taraf zaten bulunuyor.', cause: error }
  }
  if (fields.code === '23505' && lowerMessage.includes('primary')) {
    return { code: 'conflict', message: 'Bu ticari taraf için zaten birincil bir kişi bulunuyor.', cause: error }
  }
  if (fields.code === '42501' || fields.code === 'PGRST301') {
    return { code: 'forbidden', message: 'Bu işlem için şirket yetkiniz bulunmuyor.', cause: error }
  }
  if (fields.code === 'PGRST116') return { code: 'not_found', message: 'Kayıt bulunamadı.', cause: error }
  return { code: 'database', message: 'CRM işlemi tamamlanamadı. Lütfen yeniden deneyin.', cause: error }
}

function validationFailure<T>(message: string): CRMRepositoryResult<T> {
  return { data: null, error: { code: 'validation', message, cause: null } }
}

export function partyCreateRpcPayload(companyId: string, input: BusinessPartyCreateInput): CRMRepositoryResult<Record<string, unknown>> {
  const validated = normalizePartyCreateInput(input)
  if (!validated.value) return validationFailure(validated.error ?? 'Ticari taraf bilgileri geçersiz.')
  const value = validated.value
  return {
    error: null,
    data: {
      target_company_id: companyId,
      party_display_name: value.displayName,
      initial_roles: value.roles,
      party_type_value: value.partyType,
      party_legal_name: value.legalName,
      party_tax_id: value.taxId,
      party_tax_office: value.taxOffice,
      party_main_phone: value.mainPhone,
      party_main_email: value.mainEmail,
      party_website: value.website,
      party_sector: value.sector,
      party_city: value.city,
      party_country_code: value.countryCode,
      party_address: value.address,
      party_relationship_status: value.relationshipStatus,
      party_source: value.source,
      party_notes: value.notes,
    },
  }
}

function partyUpdatePayload(input: BusinessPartyUpdateInput): CRMRepositoryResult<Record<string, unknown>> {
  const validated = normalizePartyUpdateInput(input)
  if (!validated.value) return validationFailure(validated.error ?? 'Ticari taraf bilgileri geçersiz.')
  const value = validated.value
  const payload: Record<string, unknown> = {}
  const mapping: Array<[keyof BusinessPartyUpdateInput, string]> = [
    ['partyType', 'party_type'], ['displayName', 'display_name'], ['legalName', 'legal_name'], ['taxId', 'tax_id'],
    ['taxOffice', 'tax_office'], ['mainPhone', 'main_phone'], ['mainEmail', 'main_email'], ['website', 'website'],
    ['sector', 'sector'], ['city', 'city'], ['countryCode', 'country_code'], ['address', 'address'],
    ['relationshipStatus', 'relationship_status'], ['source', 'source'], ['notes', 'notes'],
  ]
  for (const [key, column] of mapping) if (key in value) payload[column] = value[key]
  return { data: payload, error: null }
}

function contactCreatePayload(companyId: string, input: BusinessContactCreateInput): CRMRepositoryResult<Record<string, unknown>> {
  const validated = normalizeContactCreateInput(input)
  if (!validated.value) return validationFailure(validated.error ?? 'Kişi bilgileri geçersiz.')
  const value = validated.value
  return {
    error: null,
    data: {
      company_id: companyId,
      party_id: value.partyId,
      first_name: value.firstName,
      last_name: value.lastName,
      job_title: value.jobTitle,
      department: value.department,
      email: value.email,
      phone: value.phone,
      preferred_channel: value.preferredChannel,
      decision_role: value.decisionRole,
      is_primary: value.isPrimary,
      notes: value.notes,
    },
  }
}

function contactUpdatePayload(input: BusinessContactUpdateInput): CRMRepositoryResult<Record<string, unknown>> {
  const validated = normalizeContactUpdateInput(input)
  if (!validated.value) return validationFailure(validated.error ?? 'Kişi bilgileri geçersiz.')
  const value = validated.value
  const payload: Record<string, unknown> = {}
  const mapping: Array<[keyof BusinessContactUpdateInput, string]> = [
    ['partyId', 'party_id'], ['firstName', 'first_name'], ['lastName', 'last_name'], ['jobTitle', 'job_title'],
    ['department', 'department'], ['email', 'email'], ['phone', 'phone'], ['preferredChannel', 'preferred_channel'],
    ['decisionRole', 'decision_role'], ['isPrimary', 'is_primary'], ['notes', 'notes'],
  ]
  for (const [key, column] of mapping) if (key in value) payload[column] = value[key]
  return { data: payload, error: null }
}

export function createCrmRepository(client: CRMDataClient, now: () => string = () => new Date().toISOString()) {
  return {
    async listBusinessParties(companyId: string, filters: BusinessPartyFilters = {}): Promise<CRMRepositoryResult<BusinessParty[]>> {
      let query = client.from('business_parties').select('*, business_party_roles(role)').eq('company_id', companyId)
      if (!filters.includeArchived) query = query.is('archived_at', null)
      if (filters.relationshipStatus) query = query.eq('relationship_status', filters.relationshipStatus)
      if (filters.search?.trim()) query = query.ilike('normalized_name', `%${normalizeName(filters.search)}%`)
      const { data, error } = await query.order('display_name', { ascending: true })
      if (error) return { data: null, error: mapCRMError(error) }
      return { data: (Array.isArray(data) ? data : []).map(mapBusinessParty), error: null }
    },

    async getBusinessParty(companyId: string, partyId: string): Promise<CRMRepositoryResult<BusinessParty>> {
      const { data, error } = await client.from('business_parties')
        .select('*, business_party_roles(role)')
        .eq('company_id', companyId)
        .eq('id', partyId)
        .is('archived_at', null)
        .maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'not_found', message: 'Kayıt bulunamadı.', cause: null } }
      return { data: mapBusinessParty(data), error: null }
    },

    async createBusinessParty(companyId: string, input: BusinessPartyCreateInput): Promise<CRMRepositoryResult<string>> {
      const payload = partyCreateRpcPayload(companyId, input)
      if (payload.error) return { data: null, error: payload.error }
      const { data, error } = await client.rpc('create_business_party', payload.data)
      if (error) return { data: null, error: mapCRMError(error) }
      return { data: String(data), error: null }
    },

    async updateBusinessParty(companyId: string, partyId: string, input: BusinessPartyUpdateInput): Promise<CRMRepositoryResult<BusinessParty>> {
      const payload = partyUpdatePayload(input)
      if (payload.error) return { data: null, error: payload.error }
      const { data, error } = await client.from('business_parties').update(payload.data)
        .eq('company_id', companyId).eq('id', partyId).select('*, business_party_roles(role)').maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'not_found', message: 'Kayıt bulunamadı.', cause: null } }
      return { data: mapBusinessParty(data), error: null }
    },

    async setBusinessPartyRoles(companyId: string, partyId: string, roles: BusinessPartyRoleName[]): Promise<CRMRepositoryResult<null>> {
      const normalizedRoles = normalizeRoles(roles)
      if (!normalizedRoles) return validationFailure('En az bir geçerli ticari rol seçilmelidir.')
      const { error } = await client.rpc('set_business_party_roles', {
        target_company_id: companyId,
        target_party_id: partyId,
        intended_roles: normalizedRoles,
      })
      return error ? { data: null, error: mapCRMError(error) } : { data: null, error: null }
    },

    async archiveBusinessParty(companyId: string, partyId: string): Promise<CRMRepositoryResult<BusinessParty>> {
      const { data, error } = await client.from('business_parties').update({ archived_at: now() })
        .eq('company_id', companyId).eq('id', partyId).select('*, business_party_roles(role)').maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'not_found', message: 'Kayıt bulunamadı.', cause: null } }
      return { data: mapBusinessParty(data), error: null }
    },

    async listBusinessContacts(companyId: string, partyId?: string, filters: BusinessContactFilters = {}): Promise<CRMRepositoryResult<BusinessContact[]>> {
      let query = client.from('business_contacts').select('*').eq('company_id', companyId)
      if (partyId) query = query.eq('party_id', partyId)
      if (!filters.includeArchived) query = query.is('archived_at', null)
      const { data, error } = await query.order('first_name', { ascending: true })
      if (error) return { data: null, error: mapCRMError(error) }
      return { data: (Array.isArray(data) ? data : []).map(mapBusinessContact), error: null }
    },

    async createBusinessContact(companyId: string, input: BusinessContactCreateInput): Promise<CRMRepositoryResult<BusinessContact>> {
      const payload = contactCreatePayload(companyId, input)
      if (payload.error) return { data: null, error: payload.error }
      const { data, error } = await client.from('business_contacts').insert(payload.data).select('*').maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'database', message: 'CRM işlemi tamamlanamadı. Lütfen yeniden deneyin.', cause: null } }
      return { data: mapBusinessContact(data), error: null }
    },

    async updateBusinessContact(companyId: string, contactId: string, input: BusinessContactUpdateInput): Promise<CRMRepositoryResult<BusinessContact>> {
      const payload = contactUpdatePayload(input)
      if (payload.error) return { data: null, error: payload.error }
      const { data, error } = await client.from('business_contacts').update(payload.data)
        .eq('company_id', companyId).eq('id', contactId).select('*').maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'not_found', message: 'Kayıt bulunamadı.', cause: null } }
      return { data: mapBusinessContact(data), error: null }
    },

    async archiveBusinessContact(companyId: string, contactId: string): Promise<CRMRepositoryResult<BusinessContact>> {
      const { data, error } = await client.from('business_contacts').update({ archived_at: now() })
        .eq('company_id', companyId).eq('id', contactId).select('*').maybeSingle()
      if (error) return { data: null, error: mapCRMError(error) }
      if (!data) return { data: null, error: { code: 'not_found', message: 'Kayıt bulunamadı.', cause: null } }
      return { data: mapBusinessContact(data), error: null }
    },
  }
}

export const crmRepository = createCrmRepository(supabase as unknown as CRMDataClient)

export const {
  listBusinessParties,
  getBusinessParty,
  createBusinessParty,
  updateBusinessParty,
  setBusinessPartyRoles,
  archiveBusinessParty,
  listBusinessContacts,
  createBusinessContact,
  updateBusinessContact,
  archiveBusinessContact,
} = crmRepository
