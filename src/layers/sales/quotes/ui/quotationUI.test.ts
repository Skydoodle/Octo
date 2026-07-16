import { describe, expect, it } from "vitest";
import appSource from "../../../../App.tsx?raw";
import salesLayoutSource from "../../ui/SalesLayout.tsx?raw";
import firmDetailSource from "../../ui/FirmDetailPage.tsx?raw";
import opportunitySource from "../../execution/ui/OpportunityPages.tsx?raw";
import quotePagesSource from "./QuotePages.tsx?raw";
import quoteFormSource from "./QuoteForm.tsx?raw";
import type { BusinessContact, BusinessParty } from "../../crm/types";
import type { SalesOpportunity } from "../../execution/types";
import type { SalesQuote, SalesQuoteItem, SalesQuoteVersion } from "../types";
import { buildQuotePdfDefinition, sanitizeQuotePdfFilename } from "./quotePdf";
import {
  canWriteQuotes,
  contactOptions,
  emptyQuoteFilters,
  filterQuotes,
  opportunityOptions,
  quoteActions,
} from "./quoteUIModel";

const party = (overrides: Partial<BusinessParty> = {}): BusinessParty => ({
  id: "party-1",
  companyId: "company-1",
  partyType: "organization",
  displayName: "Örnek Müşteri",
  legalName: "Örnek Müşteri AŞ",
  taxId: "1234567890",
  taxOffice: "Merkez",
  mainPhone: null,
  mainEmail: null,
  website: null,
  sector: null,
  city: "İstanbul",
  countryCode: "TR",
  address: "Örnek Mahallesi",
  relationshipStatus: "active",
  source: null,
  notes: null,
  normalizedName: "örnek müşteri",
  normalizedTaxId: "1234567890",
  archivedAt: null,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  roles: ["customer"],
  ...overrides,
});
const contact = (
  overrides: Partial<BusinessContact> = {},
): BusinessContact => ({
  id: "contact-1",
  companyId: "company-1",
  partyId: "party-1",
  firstName: "Deniz",
  lastName: "Yılmaz",
  jobTitle: null,
  department: null,
  email: "deniz@example.test",
  phone: "+90 555 000 00 00",
  preferredChannel: "email",
  decisionRole: "decision_maker",
  isPrimary: true,
  notes: null,
  archivedAt: null,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  ...overrides,
});
const opportunity = (
  overrides: Partial<SalesOpportunity> = {},
): SalesOpportunity => ({
  id: "opportunity-1",
  companyId: "company-1",
  partyId: "party-1",
  pipelineId: "pipeline-1",
  stageId: "stage-1",
  ownerUserId: "user-1",
  title: "Yeni anlaşma",
  expectedValue: 1200,
  currency: "TRY",
  expectedCloseDate: null,
  productInterest: null,
  nextAction: null,
  nextActionAt: null,
  probability: 20,
  forecastCategory: "potential",
  expectedMarginPct: null,
  source: null,
  priority: "normal",
  customerNeed: null,
  decisionProcess: null,
  competitors: null,
  lossReason: null,
  wonAt: null,
  lostAt: null,
  archivedAt: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  ...overrides,
});
const quote = (overrides: Partial<SalesQuote> = {}): SalesQuote => ({
  id: "quote-1",
  companyId: "company-1",
  quoteNumber: "TKL-2026-000001",
  partyId: "party-1",
  contactId: "contact-1",
  opportunityId: "opportunity-1",
  ownerUserId: "user-1",
  status: "draft",
  currency: "TRY",
  issueDate: "2026-07-14",
  validUntil: "2026-07-31",
  paymentTerms: "Peşin",
  deliveryTerms: "Dijital teslimat",
  expectedDeliveryDate: "2026-08-05",
  customerNotes: "Müşteriye açık not",
  internalNotes: "PDF'E GİRMEMESİ GEREKEN İÇ NOT",
  currentVersionId: "version-1",
  approvalRequired: false,
  approvalReason: "PDF'E GİRMEMESİ GEREKEN ONAY NEDENİ",
  approvedBy: null,
  approvedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  expiredAt: null,
  cancelledAt: null,
  acceptanceEvidence: null,
  archivedAt: null,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-07-14T00:00:00Z",
  updatedAt: "2026-07-14T00:00:00Z",
  ...overrides,
});
const version = (
  overrides: Partial<SalesQuoteVersion> = {},
): SalesQuoteVersion => ({
  id: "version-1",
  companyId: "company-1",
  quoteId: "quote-1",
  versionNumber: 1,
  revisionNote: null,
  subtotal: 1000,
  discountTotal: 100,
  taxTotal: 180,
  otherTaxTotal: 0,
  grandTotal: 1080,
  totalCost: 600,
  grossMargin: 300,
  grossMarginPct: 33.3333,
  isCurrent: true,
  createdBy: "user-1",
  createdAt: "2026-07-14T00:00:00Z",
  ...overrides,
});
const item = (overrides: Partial<SalesQuoteItem> = {}): SalesQuoteItem => ({
  id: "item-1",
  companyId: "company-1",
  quoteVersionId: "version-1",
  position: 1,
  itemCode: "HIZ-01",
  description: "Kurulum hizmeti",
  quantity: 1,
  unit: "Hizmet",
  unitPrice: 1000,
  discountType: "percentage",
  discountValue: 10,
  vatRate: 20,
  otherTaxRate: 0,
  unitCost: 600,
  lineSubtotal: 1000,
  lineDiscount: 100,
  lineTax: 180,
  lineOtherTax: 0,
  lineTotal: 1080,
  lineCost: 600,
  lineMargin: 300,
  lineMarginPct: 33.3333,
  createdAt: "2026-07-14T00:00:00Z",
  ...overrides,
});

describe("quotation routes and navigation", () => {
  it("registers list, create, detail and revision routes", () => {
    for (const route of [
      "teklifler",
      "teklifler/yeni",
      "teklifler/:quoteId",
      "teklifler/:quoteId/revizyon",
    ])
      expect(appSource).toContain(`path="${route}"`);
  });
  it("places Sales Orders after Teklifler and omits intelligence", () => {
    expect(salesLayoutSource.indexOf("Satış Siparişleri")).toBeGreaterThan(
      salesLayoutSource.indexOf("Aktiviteler"),
    );
    expect(salesLayoutSource).not.toMatch(/Copilot|Tahminleme/);
  });
});

describe("quotation list and permissions", () => {
  it("exposes honest loading, error, empty and filtered-empty states", () => {
    for (const text of [
      "Teklifler yükleniyor…",
      "Teklifler yüklenemedi.",
      "Henüz teklif bulunmuyor.",
      "Filtrelerle eşleşen teklif bulunamadı.",
    ])
      expect(quotePagesSource).toContain(text);
  });
  it("keeps accountants read-only while allowing owner and employee writes", () => {
    expect(canWriteQuotes("owner")).toBe(true);
    expect(canWriteQuotes("employee")).toBe(true);
    expect(canWriteQuotes("accountant")).toBe(false);
    expect(quotePagesSource).toContain(
      "Teklif revizyonu oluşturma yetkiniz bulunmuyor.",
    );
  });
  it("filters by firm, status, search and archived state", () => {
    const rows = [quote(), quote({ id: "q2", archivedAt: "2026-07-14" })];
    const versions = new Map([["version-1", version()]]);
    const parties = new Map([["party-1", party()]]);
    expect(
      filterQuotes(rows, versions, parties, {
        ...emptyQuoteFilters,
        search: "örnek",
        status: "draft",
        party: "party-1",
      }),
    ).toHaveLength(1);
    expect(
      filterQuotes(rows, versions, parties, {
        ...emptyQuoteFilters,
        archived: true,
      }),
    ).toHaveLength(2);
  });
  it("limits contacts and opportunities to the selected firm", () => {
    expect(
      contactOptions([contact(), contact({ id: "c2", partyId: "other" })], "party-1"),
    ).toHaveLength(1);
    expect(
      opportunityOptions(
        [opportunity(), opportunity({ id: "o2", partyId: "other" })],
        "party-1",
      ),
    ).toHaveLength(1);
  });
});

describe("quotation creation, versions and transitions", () => {
  it("supports line addition, duplication, removal and reordering", () => {
    for (const text of [
      "Kalem ekle",
      "Kalemi çoğalt",
      "Kalemi kaldır",
      "Yukarı taşı",
      "Aşağı taşı",
    ])
      expect(quoteFormSource).toContain(text);
  });
  it("creates through the atomic repository without supplying totals", () => {
    expect(quotePagesSource).toContain("createSalesQuote(activeCompany!.id, v)");
    const invocation = quotePagesSource.match(/createSalesQuote\(activeCompany!\.id, v\)/)?.[0];
    expect(invocation).not.toMatch(/subtotal|grandTotal|taxTotal/);
  });
  it("renders server-confirmed totals and immutable historical versions", () => {
    expect(quoteFormSource).toContain("Supabase tarafından");
    expect(quotePagesSource).toContain("Tarihsel · salt okunur");
    expect(quotePagesSource).toContain("listSalesQuoteItems");
  });
  it("requires a revision note and uses the revision RPC repository method", () => {
    expect(quotePagesSource).toContain("Revizyon notu gereklidir.");
    expect(quotePagesSource).toContain("createSalesQuoteRevision(activeCompany!.id");
    expect(quotePagesSource).toContain("Yeni teklif versiyonu oluşturuldu.");
  });
  it("offers only valid status actions and leaves terminal states closed", () => {
    expect(quoteActions("draft", true, false, false)).toEqual([
      "pending_approval",
      "cancelled",
    ]);
    expect(quoteActions("pending_approval", true, false, true)).toContain("sent");
    expect(quoteActions("pending_approval", true, false, false)).not.toContain("sent");
    expect(quoteActions("accepted", false, false, true)).toEqual([]);
    expect(quotePagesSource).toContain("transitionSalesQuoteStatus(activeCompany!.id");
  });
  it("requires evidence or reasons and delegates order conversion to its panel", () => {
    expect(quotePagesSource).toContain("Kabul kanıtı veya gerekçe zorunludur.");
    expect(quotePagesSource).toContain("Ret gerekçesi zorunludur.");
    expect(quotePagesSource).toContain("İptal gerekçesi zorunludur.");
    expect(quotePagesSource).toContain("<QuoteOrderPanel");
    expect(quotePagesSource).not.toMatch(/sales_order.*insert/i);
  });
});

describe("customer-safe PDF", () => {
  const definition = buildQuotePdfDefinition({
    seller: { name: "Octo Örnek Şirket" },
    quote: quote(),
    version: version(),
    items: [item()],
    party: party(),
    contact: contact(),
    generatedAt: new Date("2026-07-14T12:00:00Z"),
  });
  const pdfText = JSON.stringify(definition);
  it("contains deterministic customer, item, total and commercial fields", () => {
    for (const text of [
      "Octo Örnek Şirket",
      "TKL-2026-000001",
      "Örnek Müşteri AŞ",
      "Kurulum hizmeti",
      "Müşteriye açık not",
      "GENEL TOPLAM",
    ])
      expect(pdfText).toContain(text);
  });
  it("excludes internal notes, costs, margins and approval details", () => {
    expect(pdfText).not.toContain("PDF'E GİRMEMESİ GEREKEN İÇ NOT");
    expect(pdfText).not.toContain("PDF'E GİRMEMESİ GEREKEN ONAY NEDENİ");
    expect(pdfText).not.toMatch(/unitCost|grossMargin|lineMargin|approvalReason/);
  });
  it("uses the explicitly selected historical version and its items", () => {
    const historical = JSON.stringify(
      buildQuotePdfDefinition({
        seller: { name: "Octo" },
        quote: quote(),
        version: version({ id: "version-old", versionNumber: 2, grandTotal: 540 }),
        items: [item({ quoteVersionId: "version-old", description: "Eski sürüm kalemi", lineTotal: 540 })],
        party: party(),
        contact: null,
      }),
    );
    expect(historical).toContain("v2");
    expect(historical).toContain("Eski sürüm kalemi");
  });
  it("sanitizes the required PDF filename", () => {
    expect(sanitizeQuotePdfFilename("TKL/2026:000001", 3)).toBe(
      "Teklif_TKL_2026_000001_v3.pdf",
    );
  });
});

describe("firm and opportunity integration", () => {
  it("adds quotation links without Finance synchronization claims", () => {
    expect(firmDetailSource).toContain("<QuoteLinks");
    expect(opportunitySource).toContain("<QuoteLinks");
    expect(opportunitySource).toContain("opportunityId={o.id}");
    expect(`${firmDetailSource}${opportunitySource}`).not.toMatch(
      /cariStore|fatura|tahsilat|finans bakiyesi/i,
    );
  });
});
