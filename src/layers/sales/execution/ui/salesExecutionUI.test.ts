import { describe, expect, it } from "vitest";
import appSource from "../../../../App.tsx?raw";
import salesLayoutSource from "../../ui/SalesLayout.tsx?raw";
import leadPagesSource from "./LeadPages.tsx?raw";
import opportunityPagesSource from "./OpportunityPages.tsx?raw";
import pipelineSource from "./PipelinePage.tsx?raw";
import activitiesSource from "./ActivitiesPage.tsx?raw";
import conversionMigration from "../../../../../supabase/migrations/20260713100000_extend_sales_lead_conversion.sql?raw";
import type {
  SalesActivity,
  SalesLead,
  SalesOpportunity,
  SalesPipelineStage,
} from "../types";
import {
  canWriteExecution,
  filterActivities,
  filterLeads,
  filterOpportunities,
} from "./executionUIModel";

const lead = (overrides: Partial<SalesLead> = {}): SalesLead => ({
  id: "lead-1",
  companyId: "company-1",
  leadType: "organization",
  companyName: "Örnek Firma",
  firstName: null,
  lastName: null,
  email: "ornek@example.test",
  phone: null,
  source: "Web",
  productInterest: "Octo",
  assignedTo: "user-1",
  status: "qualified",
  estimatedValue: 1000,
  currency: "TRY",
  qualificationNotes: null,
  nextAction: "Ara",
  nextActionAt: "2026-07-12T09:00:00Z",
  disqualificationReason: null,
  convertedPartyId: null,
  convertedContactId: null,
  convertedOpportunityId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-07-10T09:00:00Z",
  updatedAt: "2026-07-10T09:00:00Z",
  ...overrides,
});

const stage = (
  overrides: Partial<SalesPipelineStage> = {},
): SalesPipelineStage => ({
  id: "stage-1",
  companyId: "company-1",
  pipelineId: "pipeline-1",
  name: "Yeni fırsat",
  stageKey: "new",
  position: 1,
  defaultProbability: 10,
  staleAfterDays: 7,
  isClosed: false,
  outcome: null,
  requiredFields: [],
  recommendedActions: [],
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
  ...overrides,
});

const opportunity = (
  overrides: Partial<SalesOpportunity> = {},
): SalesOpportunity => ({
  id: "opp-1",
  companyId: "company-1",
  partyId: "party-1",
  pipelineId: "pipeline-1",
  stageId: "stage-1",
  ownerUserId: "user-1",
  title: "Octo fırsatı",
  expectedValue: 1000,
  currency: "TRY",
  expectedCloseDate: "2026-07-12",
  productInterest: null,
  nextAction: null,
  nextActionAt: null,
  probability: 10,
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
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
  ...overrides,
});

const activity = (overrides: Partial<SalesActivity> = {}): SalesActivity => ({
  id: "activity-1",
  companyId: "company-1",
  activityType: "task",
  leadId: "lead-1",
  partyId: null,
  contactId: null,
  opportunityId: null,
  ownerUserId: "user-1",
  assignedTo: "user-1",
  title: "Takip",
  description: null,
  outcome: null,
  activityAt: "2026-07-10T09:00:00Z",
  dueAt: "2026-07-12T09:00:00Z",
  completedAt: null,
  nextAction: null,
  nextActionAt: null,
  visibility: "sales_team",
  archivedAt: null,
  createdAt: "2026-07-10T09:00:00Z",
  updatedAt: "2026-07-10T09:00:00Z",
  ...overrides,
});

describe("sales execution UI routes and navigation", () => {
  it("registers every protected execution route", () => {
    for (const route of [
      "potansiyel-musteriler",
      "potansiyel-musteriler/:leadId",
      "firsatlar",
      "firsatlar/:opportunityId",
      "pipeline",
      "aktiviteler",
    ])
      expect(appSource).toContain(`path="${route}"`);
  });

  it("orders the module navigation and omits unfinished products", () => {
    const labels = [
      "Firmalar",
      "Kişiler",
      "Potansiyel Müşteriler",
      "Fırsatlar",
      "Pipeline",
      "Aktiviteler ve Görevler",
      "Teklifler",
    ];
    labels.reduce((position, label) => {
      const next =
        label === "Teklifler"
          ? salesLayoutSource.lastIndexOf(label)
          : salesLayoutSource.indexOf(label);
      expect(next).toBeGreaterThan(position);
      return next;
    }, -1);
    expect(salesLayoutSource).not.toMatch(/satis\/siparis|copilot/i);
  });
});

describe("lead UI behavior", () => {
  const filters = {
    search: "",
    status: "",
    assignedTo: "",
    source: "",
    overdue: false,
    includeArchived: false,
  };

  it("filters leads by search, assignment, source, overdue state and archive state", () => {
    const rows = [
      lead(),
      lead({ id: "lead-2", companyName: "Arşiv", archivedAt: "2026-07-11" }),
    ];
    expect(
      filterLeads(
        rows,
        {
          ...filters,
          search: "örnek",
          assignedTo: "user-1",
          source: "Web",
          overdue: true,
        },
        new Date("2026-07-13"),
      ),
    ).toHaveLength(1);
    expect(filterLeads(rows, filters)).toHaveLength(1);
    expect(
      filterLeads(rows, { ...filters, includeArchived: true }),
    ).toHaveLength(2);
  });

  it("renders honest loading, error, empty and permission states", () => {
    expect(leadPagesSource).toContain("Potansiyel müşteriler yükleniyor…");
    expect(leadPagesSource).toContain("Potansiyel müşteriler yüklenemedi.");
    expect(leadPagesSource).toContain("Henüz potansiyel müşteri bulunmuyor.");
    expect(canWriteExecution("accountant")).toBe(false);
  });

  it("keeps conversion atomic for existing and new firms and prevents duplicate conversion actions", () => {
    expect(leadPagesSource).toContain("convertSalesLead(companyId");
    expect(leadPagesSource).toContain("Mevcut firma");
    expect(leadPagesSource).toContain("Yeni firma");
    expect(leadPagesSource).toContain('lead.status === "qualified"');
    expect(leadPagesSource).toContain(
      "Potansiyel müşteri başarıyla dönüştürüldü.",
    );
    expect(conversionMigration).toContain("opportunity_expected_value");
    expect(conversionMigration).toContain("opportunity_owner_user_id");
  });
});

describe("opportunity and pipeline UI behavior", () => {
  const filters = {
    search: "",
    pipelineId: "",
    stageId: "",
    ownerUserId: "",
    forecast: "",
    priority: "",
    state: "",
    stale: false,
    overdue: false,
    missingNextAction: false,
    includeArchived: false,
  };

  it("supports opportunity filters without hiding closed records by default", () => {
    const closed = stage({ id: "won", isClosed: true, outcome: "won" });
    const rows = [opportunity(), opportunity({ id: "opp-2", stageId: "won" })];
    expect(
      filterOpportunities(
        rows,
        [stage(), closed],
        new Map([["party-1", "Örnek Firma"]]),
        filters,
      ),
    ).toHaveLength(2);
    expect(
      filterOpportunities(rows, [stage(), closed], new Map(), {
        ...filters,
        state: "open",
      }),
    ).toHaveLength(1);
    expect(
      filterOpportunities(rows, [stage(), closed], new Map(), {
        ...filters,
        missingNextAction: true,
      }),
    ).toHaveLength(1);
  });

  it("renders detail, contacts, warnings and stage history", () => {
    for (const text of [
      "Sonraki Eylem",
      "Kişiler",
      "Aktiviteler",
      "Aşama Geçmişi",
      "Sonraki eylem eksik",
      "Kapanış gecikti",
    ])
      expect(opportunityPagesSource).toContain(text);
    expect(opportunityPagesSource).toContain("setOpportunityContacts");
  });

  it("moves stages only through the controlled RPC with loss and closed-stage guards", () => {
    expect(pipelineSource).toContain("moveSalesOpportunityStage");
    expect(pipelineSource).toContain("kayıp nedeni gereklidir");
    expect(pipelineSource).toContain("Kapalı fırsatlar V1’de yeniden açılamaz");
    expect(pipelineSource).toContain("Aşamayı değiştir");
    expect(pipelineSource).toContain("draggable=");
  });
});

describe("activities, tasks and permissions", () => {
  it("keeps all, today, overdue, week, mine and team views distinct", () => {
    const old = activity({
      id: "old",
      dueAt: "2026-07-01T09:00:00Z",
      assignedTo: "user-2",
      ownerUserId: "user-2",
    });
    const rows = [activity(), old];
    const now = new Date("2026-07-12T12:00:00Z");
    expect(filterActivities(rows, "all", "user-1", now)).toHaveLength(2);
    expect(filterActivities(rows, "today", "user-1", now)).toHaveLength(1);
    expect(filterActivities(rows, "overdue", "user-1", now)).toHaveLength(2);
    expect(filterActivities(rows, "mine", "user-1", now)).toHaveLength(1);
    expect(filterActivities(rows, "team", "user-1", now)).toHaveLength(1);
  });

  it("supports logging, editing, archiving and completing tasks without external sending", () => {
    for (const token of [
      "createSalesActivity",
      "updateSalesActivity",
      "archiveSalesActivity",
      "completeSalesTask",
    ])
      expect(activitiesSource).toContain(token);
    expect(activitiesSource).toMatch(
      /bu ekran dış e-posta veya mesaj\s+göndermez/,
    );
    expect(activitiesSource).toContain("salt okunurdur");
  });

  it("does not claim Finance synchronization or expose intelligence features", () => {
    const combined = [
      leadPagesSource,
      opportunityPagesSource,
      pipelineSource,
      activitiesSource,
      salesLayoutSource,
    ].join("\n");
    expect(combined).not.toMatch(
      /Firma 360|Finans bakiyesi|Satış Copilot|fırsat skoru|Teklif oluştur/,
    );
  });
});
