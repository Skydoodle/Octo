import { describe, expect, it } from 'vitest'
import appSource from '../../../App.tsx?raw'
import layoutSource from '../../../surfaces/dashboard/Layout.tsx?raw'
import firmsSource from './FirmsPage.tsx?raw'
import detailSource from './FirmDetailPage.tsx?raw'
import contactsSource from './ContactsPage.tsx?raw'
import type { BusinessContact, BusinessParty } from '../crm/types'
import { canWriteCRM, decisionLabels, filterContacts, filterFirms, roleLabels, statusLabels } from './salesViewModel'

const party = (overrides: Partial<BusinessParty> = {}): BusinessParty => ({ id: 'p1', companyId: 'c1', partyType: 'organization', displayName: 'Kuzey Teknoloji', legalName: 'Kuzey Teknoloji AŞ', taxId: '1234567890', taxOffice: null, mainPhone: null, mainEmail: 'bilgi@kuzey.test', website: null, sector: 'Teknoloji', city: 'İstanbul', countryCode: 'TR', address: null, relationshipStatus: 'active', source: null, notes: null, normalizedName: 'kuzey teknoloji', normalizedTaxId: '1234567890', archivedAt: null, createdBy: 'u1', updatedBy: 'u1', createdAt: '2026-01-01', updatedAt: '2026-01-02', roles: ['customer', 'supplier'], ...overrides })
const contact = (overrides: Partial<BusinessContact> = {}): BusinessContact => ({ id: 'x1', companyId: 'c1', partyId: 'p1', firstName: 'Ada', lastName: 'Yılmaz', jobTitle: 'Direktör', department: 'Satış', email: 'ada@kuzey.test', phone: '555', preferredChannel: 'email', decisionRole: 'decision_maker', isPrimary: true, notes: null, archivedAt: null, createdBy: 'u1', updatedBy: 'u1', createdAt: '2026-01-01', updatedAt: '2026-01-02', ...overrides })

describe('Sales CRM view model', () => {
  it('filters firms by search, role, status and excludes archived records by default', () => {
    const archived = party({ id: 'p2', displayName: 'Arşiv Firma', archivedAt: '2026-02-01' })
    expect(filterFirms([party(), archived], { search: '1234', role: 'supplier', status: 'active', includeArchived: false }).map(p => p.id)).toEqual(['p1'])
    expect(filterFirms([party(), archived], { search: '', role: '', status: '', includeArchived: false })).toHaveLength(1)
    expect(filterFirms([party(), archived], { search: '', role: '', status: '', includeArchived: true })).toHaveLength(2)
  })

  it('filters contacts by person, firm, decision role and primary status', () => {
    expect(filterContacts([contact()], [party()], { search: 'kuzey', partyId: 'p1', decisionRole: 'decision_maker', primary: 'primary', includeArchived: false })).toHaveLength(1)
    expect(filterContacts([contact({ archivedAt: '2026-02-01' })], [party()], { search: '', partyId: '', decisionRole: '', primary: '', includeArchived: false })).toHaveLength(0)
  })

  it('uses formal Turkish labels and company membership permissions', () => {
    expect(roleLabels).toMatchObject({ prospect: 'Potansiyel', customer: 'Müşteri', supplier: 'Tedarikçi' })
    expect(statusLabels).toMatchObject({ active: 'Aktif', lost: 'Kaybedildi' })
    expect(decisionLabels.decision_maker).toBe('Karar Verici')
    expect(canWriteCRM({ id: 'c', name: 'C', base_currency: 'TRY', role: 'owner', membership_status: 'active' })).toBe(true)
    expect(canWriteCRM({ id: 'c', name: 'C', base_currency: 'TRY', role: 'employee', membership_status: 'active' })).toBe(true)
    expect(canWriteCRM({ id: 'c', name: 'C', base_currency: 'TRY', role: 'accountant', membership_status: 'active' })).toBe(false)
  })
})

describe('Sales CRM interface contract', () => {
  it('registers sales navigation and all four protected dashboard routes', () => {
    expect(layoutSource).toContain("label: 'Satış ve Teklifler'")
    expect(appSource).toContain('path="satis"')
    expect(appSource).toContain('path="firmalar"')
    expect(appSource).toContain('path="firmalar/:partyId"')
    expect(appSource).toContain('path="kisiler"')
  })

  it('includes honest firms loading, error, empty and creation states', () => {
    expect(firmsSource).toContain('Firmalar yükleniyor…')
    expect(firmsSource).toContain('Firmalar şu anda yüklenemiyor')
    expect(firmsSource).toContain('Henüz firma yok')
    expect(firmsSource).toContain('Firma oluşturuldu.')
    expect(firmsSource).toContain('createBusinessParty')
  })

  it('supports detail editing, safe not-found, role updates and archive confirmation', () => {
    expect(detailSource).toContain('Firma bulunamadı veya bu şirkette görüntülenemiyor.')
    expect(detailSource).toContain('Firma bilgileri güncellendi.')
    expect(detailSource).toContain('setBusinessPartyRoles')
    expect(detailSource).toContain('Bu firma arşivlenecek. Kayıt ve geçmiş bilgiler korunmaya devam edecek.')
  })

  it('supports contact creation, editing, primary conflict safety and archiving', () => {
    expect(contactsSource).toContain('İlgili kişi oluşturuldu.')
    expect(contactsSource).toContain('İlgili kişi güncellendi.')
    expect(contactsSource).toContain('İlgili kişi arşivlendi.')
    expect(contactsSource).toContain('createBusinessContact')
    expect(contactsSource).toContain('archiveBusinessContact')
  })

  it('does not expose unfinished sales navigation or claim Finance synchronization', () => {
    const customerFacing = [layoutSource, firmsSource, detailSource, contactsSource].join('\n')
    expect(customerFacing).not.toMatch(/Fırsatlar|Pipeline|Tekliflerim|Müşteri Sağlığı|Cari senkron/)
  })
})
