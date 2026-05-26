// ── OCTO CORE SCHEMA ─────────────────────────────────────────────
// Frozen on Day 1. All layers write to these types.
// Do not change without both founders agreeing.

export type SectorCode =
  | 'food_beverage'
  | 'retail'
  | 'manufacturing'
  | 'professional_services'
  | 'construction'
  | 'import_export'
  | 'other';

export type Currency = 'TRY' | 'USD' | 'EUR';

export type LayerId =
  | 'finance'
  | 'tax'
  | 'legal'
  | 'hr'
  | 'operations'
  | 'stock'
  | 'sales'
  | 'audit'
  | 'compliance';

export interface OctoCompany {
  id: string;
  name: string;
  taxId: string;
  taxOffice: string;
  sector: SectorCode;
  employeeCount: number;
  createdAt: Date;
}

export interface OctoInvoice {
  id: string;
  companyId: string;
  type: 'sales' | 'purchase';
  cont
cat > src/shared/types/core.ts << 'EOF'
// ── OCTO CORE SCHEMA ─────────────────────────────────────────────
// Frozen on Day 1. All layers write to these types.
// Do not change without both founders agreeing.

export type SectorCode =
  | 'food_beverage'
  | 'retail'
  | 'manufacturing'
  | 'professional_services'
  | 'construction'
  | 'import_export'
  | 'other';

export type Currency = 'TRY' | 'USD' | 'EUR';

export type LayerId =
  | 'finance'
  | 'tax'
  | 'legal'
  | 'hr'
  | 'operations'
  | 'stock'
  | 'sales'
  | 'audit'
  | 'compliance';

export interface OctoCompany {
  id: string;
  name: string;
  taxId: string;
  taxOffice: string;
  sector: SectorCode;
  employeeCount: number;
  createdAt: Date;
}

export interface OctoInvoice {
  id: string;
  companyId: string;
  type: 'sales' | 'purchase';
  contactId: string;
  lineItems: LineItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  currency: Currency;
  exchangeRate: number;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  eFaturaUUID: string | null;
  eFaturaStatus: 'pending' | 'sent' | 'accepted' | 'rejected' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
  productId: string | null;
}

export interface OctoTransaction {
  id: string;
  companyId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: Currency;
  exchangeRate: number;
  description: string;
  category: string;
  date: Date;
  invoiceId: string | null;
  contactId: string | null;
  reconciled: boolean;
}

export interface OctoBankAccount {
  id: string;
  companyId: string;
  name: string;
  iban: string;
  currency: Currency;
  currentBalance: number;
  lastSyncedAt: Date | null;
  importMethod: 'manual_csv' | 'bank_api' | 'manual_entry';
}

export interface OctoContact {
  id: string;
  companyId: string;
  type: 'customer' | 'supplier' | 'both';
  name: string;
  taxId: string;
  taxOffice: string;
  eFaturaAlias: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTermsDays: number;
}

export interface OctoEmployee {
  id: string;
  companyId: string;
  name: string;
  tcKimlikNo: string;
  sgkNo: string | null;
  department: string;
  startDate: Date;
  endDate: Date | null;
  grossSalary: number;
  contractType: 'full_time' | 'part_time' | 'contractor';
}

export interface OctoProduct {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  costPrice: number;
  salePrice: number;
  vatRate: number;
  lastMovementAt: Date | null;
}

export interface OctoContract {
  id: string;
  companyId: string;
  title: string;
  type: 'customer' | 'supplier' | 'employment' | 'lease' | 'other';
  contactId: string | null;
  startDate: Date;
  endDate: Date | null;
  renewalDate: Date | null;
  noticePeriodDays: number;
  value: number | null;
  currency: Currency;
  autoRenews: boolean;
  status: 'active' | 'expiring' | 'expired' | 'terminated';
  fileUrl: string | null;
}

export interface OctoAlert {
  id: string;
  companyId: string;
  layerId: LayerId;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  financialImpact: number;
  deadline: Date | null;
  suggestedAction: string;
  relatedLayers: LayerId[];
  isRead: boolean;
  createdAt: Date;
}

export interface AuditInput {
  armId: LayerId;
  obligations: Obligation[];
  metrics: Record<string, number>;
}

export interface Obligation {
  type: 'payment' | 'filing' | 'renewal' | 'registration';
  amount: number | null;
  dueDate: Date;
  description: string;
  flexibility: 'fixed' | 'negotiable' | 'deferrable';
}

export interface ArmReport {
  armId: LayerId;
  companyId: string;
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  alerts: OctoAlert[];
  metrics: Record<string, number>;
  auditContribution: AuditInput;
}
