export type BusinessPartyType = 'organization' | 'individual'
export type BusinessRelationshipStatus = 'potential' | 'active' | 'inactive' | 'lost' | 'other'
export type BusinessPartyRoleName = 'prospect' | 'customer' | 'supplier' | 'partner' | 'other'
export type PreferredContactChannel = 'email' | 'phone' | 'whatsapp' | 'other'
export type ContactDecisionRole = 'decision_maker' | 'influencer' | 'technical' | 'user' | 'procurement' | 'finance' | 'approver' | 'other'

export interface BusinessParty {
  id: string
  companyId: string
  partyType: BusinessPartyType
  displayName: string
  legalName: string | null
  taxId: string | null
  taxOffice: string | null
  mainPhone: string | null
  mainEmail: string | null
  website: string | null
  sector: string | null
  city: string | null
  countryCode: string
  address: string | null
  relationshipStatus: BusinessRelationshipStatus
  source: string | null
  notes: string | null
  normalizedName: string
  normalizedTaxId: string | null
  archivedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  roles: BusinessPartyRoleName[]
}

export interface BusinessPartyRole {
  id: string
  companyId: string
  partyId: string
  role: BusinessPartyRoleName
  createdBy: string
  createdAt: string
}

export interface BusinessContact {
  id: string
  companyId: string
  partyId: string
  firstName: string
  lastName: string | null
  jobTitle: string | null
  department: string | null
  email: string | null
  phone: string | null
  preferredChannel: PreferredContactChannel | null
  decisionRole: ContactDecisionRole | null
  isPrimary: boolean
  notes: string | null
  archivedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface BusinessPartyCreateInput {
  partyType?: BusinessPartyType
  displayName: string
  legalName?: string | null
  taxId?: string | null
  taxOffice?: string | null
  mainPhone?: string | null
  mainEmail?: string | null
  website?: string | null
  sector?: string | null
  city?: string | null
  countryCode?: string
  address?: string | null
  relationshipStatus?: BusinessRelationshipStatus
  source?: string | null
  notes?: string | null
  roles: BusinessPartyRoleName[]
}

export type BusinessPartyUpdateInput = Partial<Omit<BusinessPartyCreateInput, 'roles'>>

export interface BusinessContactCreateInput {
  partyId: string
  firstName: string
  lastName?: string | null
  jobTitle?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  preferredChannel?: PreferredContactChannel | null
  decisionRole?: ContactDecisionRole | null
  isPrimary?: boolean
  notes?: string | null
}

export type BusinessContactUpdateInput = Partial<Omit<BusinessContactCreateInput, 'partyId'>> & { partyId?: string }

export interface BusinessPartyFilters {
  includeArchived?: boolean
  relationshipStatus?: BusinessRelationshipStatus
  search?: string
}

export interface BusinessContactFilters {
  includeArchived?: boolean
}

export type CRMRepositoryErrorCode = 'validation' | 'duplicate_tax_id' | 'forbidden' | 'not_found' | 'conflict' | 'database'

export interface CRMRepositoryError {
  code: CRMRepositoryErrorCode
  message: string
  cause: unknown
}

export type CRMRepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: CRMRepositoryError }
