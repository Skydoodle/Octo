import { describe, expect, it, vi } from 'vitest'
import migrationSource from '../../../../supabase/migrations/20260712190000_crm_data_foundation_v1.sql?raw'
import { createCrmRepository, mapCRMError, partyCreateRpcPayload, type CRMDataClient } from './crmRepository'
import {
  normalizeContactCreateInput,
  normalizeEmail,
  normalizeName,
  normalizePartyCreateInput,
  normalizeRoles,
  normalizeTaxId,
  optionalText,
} from './validation'

interface Operation {
  method: string
  args: unknown[]
}

class FakeQuery implements PromiseLike<{ data: unknown; error: unknown | null }> {
  operations: Operation[] = []

  constructor(private response: { data: unknown; error: unknown | null }) {}

  private operation(method: string, ...args: unknown[]) {
    this.operations.push({ method, args })
    return this
  }

  select(columns: string) { return this.operation('select', columns) }
  insert(values: Record<string, unknown>) { return this.operation('insert', values) }
  update(values: Record<string, unknown>) { return this.operation('update', values) }
  eq(column: string, value: unknown) { return this.operation('eq', column, value) }
  is(column: string, value: null) { return this.operation('is', column, value) }
  ilike(column: string, value: string) { return this.operation('ilike', column, value) }
  order(column: string, options?: { ascending?: boolean }) { return this.operation('order', column, options) }
  maybeSingle() { this.operation('maybeSingle'); return Promise.resolve(this.response) }
  then<TResult1 = { data: unknown; error: unknown | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected)
  }
}

class FakeClient {
  queries: Array<{ table: string; query: FakeQuery }> = []
  rpc = vi.fn(async () => ({ data: 'party-1', error: null }))

  constructor(private responses: Array<{ data: unknown; error: unknown | null }> = [{ data: [], error: null }]) {}

  from(table: string) {
    const query = new FakeQuery(this.responses.shift() ?? { data: [], error: null })
    this.queries.push({ table, query })
    return query
  }
}

describe('CRM data foundation validation', () => {
  it('normalizes party names, tax IDs, email, and optional empty strings', () => {
    expect(normalizeName('  ACME   Sanayi ')).toBe('acme sanayi')
    expect(normalizeTaxId(' TR 12-34.56 ')).toBe('TR123456')
    expect(normalizeEmail(' SALES@EXAMPLE.COM ')).toBe('sales@example.com')
    expect(optionalText('   ')).toBeNull()

    const result = normalizePartyCreateInput({
      displayName: '  ACME   Sanayi ',
      taxId: '12 34-56',
      mainEmail: ' INFO@EXAMPLE.COM ',
      legalName: ' ',
      roles: ['customer', 'supplier'],
    })
    expect(result.error).toBeNull()
    expect(result.value).toMatchObject({
      displayName: 'ACME Sanayi',
      taxId: '123456',
      mainEmail: 'info@example.com',
      legalName: null,
      roles: ['customer', 'supplier'],
    })
  })

  it('supports multiple roles and rejects empty or invalid roles', () => {
    expect(normalizeRoles(['customer', 'supplier', 'customer'])).toEqual(['customer', 'supplier'])
    expect(normalizeRoles([])).toBeNull()
    expect(normalizeRoles(['owner'])).toBeNull()
  })

  it('validates contacts and optional email structure', () => {
    expect(normalizeContactCreateInput({ partyId: 'party-1', firstName: ' ', email: 'person@example.com' }).error).toContain('Ad')
    expect(normalizeContactCreateInput({ partyId: 'party-1', firstName: 'Ada', email: 'invalid' }).error).toContain('e-posta')
    expect(normalizeContactCreateInput({ partyId: 'party-1', firstName: ' Ada ', email: ' ADA@EXAMPLE.COM ', phone: ' ' }).value).toMatchObject({
      firstName: 'Ada',
      email: 'ada@example.com',
      phone: null,
    })
  })

  it('enforces one active primary contact and company-matching foreign keys in SQL', () => {
    expect(migrationSource).toContain('create unique index business_contacts_one_active_primary')
    expect(migrationSource).toContain('where is_primary = true and archived_at is null')
    expect(migrationSource).toContain('business_contacts_party_company_fk')
    expect(migrationSource).toContain('business_party_roles_party_company_fk')
  })
})

describe('CRM repository', () => {
  it('maps normalized create input to the atomic company-scoped RPC payload', () => {
    const result = partyCreateRpcPayload('company-1', {
      displayName: '  ACME  ',
      taxId: '12-34',
      mainEmail: 'INFO@EXAMPLE.COM',
      roles: ['customer', 'supplier'],
    })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      target_company_id: 'company-1',
      party_display_name: 'ACME',
      party_tax_id: '1234',
      party_main_email: 'info@example.com',
      initial_roles: ['customer', 'supplier'],
    })
    expect(result.data).not.toHaveProperty('created_by')
    expect(result.data).not.toHaveProperty('updated_by')
  })

  it('calls create and role RPCs with explicit company scope', async () => {
    const client = new FakeClient()
    const repository = createCrmRepository(client as unknown as CRMDataClient)
    await repository.createBusinessParty('company-1', { displayName: 'ACME', roles: ['customer'] })
    expect(client.rpc).toHaveBeenCalledWith('create_business_party', expect.objectContaining({ target_company_id: 'company-1' }))

    await repository.setBusinessPartyRoles('company-1', 'party-1', ['customer', 'supplier'])
    expect(client.rpc).toHaveBeenCalledWith('set_business_party_roles', {
      target_company_id: 'company-1',
      target_party_id: 'party-1',
      intended_roles: ['customer', 'supplier'],
    })
  })

  it('excludes archived parties by default and includes them only explicitly', async () => {
    const defaultClient = new FakeClient()
    await createCrmRepository(defaultClient as unknown as CRMDataClient).listBusinessParties('company-1')
    expect(defaultClient.queries[0].query.operations).toContainEqual({ method: 'eq', args: ['company_id', 'company-1'] })
    expect(defaultClient.queries[0].query.operations).toContainEqual({ method: 'is', args: ['archived_at', null] })

    const inclusiveClient = new FakeClient()
    await createCrmRepository(inclusiveClient as unknown as CRMDataClient).listBusinessParties('company-1', { includeArchived: true })
    expect(inclusiveClient.queries[0].query.operations).not.toContainEqual({ method: 'is', args: ['archived_at', null] })
  })

  it('maps duplicate tax IDs to a safe typed error while preserving the cause', () => {
    const cause = { code: '23505', message: 'An active business party with this tax ID already exists', constraint: 'business_parties_active_tax_id_unique' }
    expect(mapCRMError(cause)).toEqual({
      code: 'duplicate_tax_id',
      message: 'Bu vergi kimliğiyle aktif bir ticari taraf zaten bulunuyor.',
      cause,
    })
  })
})
