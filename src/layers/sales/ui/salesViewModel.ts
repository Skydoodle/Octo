import type { Company } from '../../../company/companyContext'
import type { BusinessContact, BusinessParty, BusinessPartyRoleName, BusinessRelationshipStatus, ContactDecisionRole, PreferredContactChannel } from '../crm/types'

export const roleLabels: Record<BusinessPartyRoleName, string> = { prospect: 'Potansiyel', customer: 'Müşteri', supplier: 'Tedarikçi', partner: 'İş Ortağı', other: 'Diğer' }
export const statusLabels: Record<BusinessRelationshipStatus, string> = { potential: 'Potansiyel', active: 'Aktif', inactive: 'Pasif', lost: 'Kaybedildi', other: 'Diğer' }
export const channelLabels: Record<PreferredContactChannel, string> = { email: 'E-posta', phone: 'Telefon', whatsapp: 'WhatsApp', other: 'Diğer' }
export const decisionLabels: Record<ContactDecisionRole, string> = { decision_maker: 'Karar Verici', influencer: 'Etkileyici', technical: 'Teknik Değerlendirici', user: 'Kullanıcı', procurement: 'Satın Alma', finance: 'Finans', approver: 'Onaylayan', other: 'Diğer' }

export function canWriteCRM(company: Company | null): boolean {
  return company?.membership_status === 'active' && (company.role === 'owner' || company.role === 'employee')
}

const fold = (value: string | null | undefined) => (value ?? '').toLocaleLowerCase('tr-TR')

export interface FirmFilters { search: string; role: '' | BusinessPartyRoleName; status: '' | BusinessRelationshipStatus; includeArchived: boolean }
export function filterFirms(parties: BusinessParty[], filters: FirmFilters): BusinessParty[] {
  const query = fold(filters.search.trim())
  return parties.filter(party => {
    if (!filters.includeArchived && party.archivedAt) return false
    if (filters.role && !party.roles.includes(filters.role)) return false
    if (filters.status && party.relationshipStatus !== filters.status) return false
    return !query || [party.displayName, party.legalName, party.taxId, party.mainEmail].some(value => fold(value).includes(query))
  })
}

export interface ContactFilters { search: string; partyId: string; decisionRole: '' | ContactDecisionRole; primary: '' | 'primary' | 'other'; includeArchived: boolean }
export function filterContacts(contacts: BusinessContact[], parties: BusinessParty[], filters: ContactFilters): BusinessContact[] {
  const query = fold(filters.search.trim())
  const partyNames = new Map(parties.map(party => [party.id, party.displayName]))
  return contacts.filter(contact => {
    if (!filters.includeArchived && contact.archivedAt) return false
    if (filters.partyId && contact.partyId !== filters.partyId) return false
    if (filters.decisionRole && contact.decisionRole !== filters.decisionRole) return false
    if (filters.primary === 'primary' && !contact.isPrimary) return false
    if (filters.primary === 'other' && contact.isPrimary) return false
    const fullName = `${contact.firstName} ${contact.lastName ?? ''}`
    return !query || [fullName, partyNames.get(contact.partyId), contact.email, contact.phone].some(value => fold(value).includes(query))
  })
}

export const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value))
export const fullName = (contact: BusinessContact) => [contact.firstName, contact.lastName].filter(Boolean).join(' ')
export const maskTaxId = (value: string | null) => value ? `••••${value.slice(-4)}` : '—'
