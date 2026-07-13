import { supabase } from "../../../lib/supabase";
import type {
  QuoteCreateInput,
  QuoteCreateResult,
  QuoteListFilters,
  QuoteRepositoryError,
  QuoteRepositoryResult,
  QuoteRevisionInput,
  QuoteRevisionResult,
  QuoteTransitionInput,
  SalesQuote,
  SalesQuoteItem,
  SalesQuoteStatusHistory,
  SalesQuoteVersion,
} from "./types";
import {
  normalizeQuoteCreate,
  normalizeQuoteRevision,
  normalizeQuoteTransition,
} from "./validation";

interface Response {
  data: unknown;
  error: unknown | null;
}
interface QuoteQuery extends PromiseLike<Response> {
  select(columns: string): QuoteQuery;
  eq(column: string, value: unknown): QuoteQuery;
  is(column: string, value: null): QuoteQuery;
  order(column: string, options?: { ascending?: boolean }): QuoteQuery;
  maybeSingle(): PromiseLike<Response>;
}
interface QuoteTable {
  select(columns: string): QuoteQuery;
}
export interface QuoteDataClient {
  from(table: string): QuoteTable;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<Response>;
}
const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
const nullable = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) =>
  typeof value === "number" ? value : Number(value);

const mapQuote = (value: unknown): SalesQuote => {
  const row = record(value);
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    quoteNumber: String(row.quote_number),
    partyId: String(row.party_id),
    contactId: nullable(row.contact_id),
    opportunityId: nullable(row.opportunity_id),
    ownerUserId: String(row.owner_user_id),
    status: row.status as SalesQuote["status"],
    currency: row.currency as SalesQuote["currency"],
    issueDate: String(row.issue_date),
    validUntil: nullable(row.valid_until),
    paymentTerms: nullable(row.payment_terms),
    deliveryTerms: nullable(row.delivery_terms),
    expectedDeliveryDate: nullable(row.expected_delivery_date),
    customerNotes: nullable(row.customer_notes),
    internalNotes: nullable(row.internal_notes),
    currentVersionId: nullable(row.current_version_id),
    approvalRequired: Boolean(row.approval_required),
    approvalReason: nullable(row.approval_reason),
    approvedBy: nullable(row.approved_by),
    approvedAt: nullable(row.approved_at),
    acceptedAt: nullable(row.accepted_at),
    rejectedAt: nullable(row.rejected_at),
    expiredAt: nullable(row.expired_at),
    cancelledAt: nullable(row.cancelled_at),
    acceptanceEvidence: nullable(row.acceptance_evidence),
    archivedAt: nullable(row.archived_at),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
};
const mapVersion = (value: unknown): SalesQuoteVersion => {
  const row = record(value);
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    quoteId: String(row.quote_id),
    versionNumber: number(row.version_number),
    revisionNote: nullable(row.revision_note),
    subtotal: number(row.subtotal),
    discountTotal: number(row.discount_total),
    taxTotal: number(row.tax_total),
    otherTaxTotal: number(row.other_tax_total),
    grandTotal: number(row.grand_total),
    totalCost: row.total_cost == null ? null : number(row.total_cost),
    grossMargin: row.gross_margin == null ? null : number(row.gross_margin),
    grossMarginPct:
      row.gross_margin_pct == null ? null : number(row.gross_margin_pct),
    isCurrent: Boolean(row.is_current),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  };
};
const mapItem = (value: unknown): SalesQuoteItem => {
  const row = record(value);
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    quoteVersionId: String(row.quote_version_id),
    position: number(row.position),
    itemCode: nullable(row.item_code),
    description: String(row.description),
    quantity: number(row.quantity),
    unit: String(row.unit),
    unitPrice: number(row.unit_price),
    discountType: row.discount_type as SalesQuoteItem["discountType"],
    discountValue: number(row.discount_value),
    vatRate: number(row.vat_rate),
    otherTaxRate: number(row.other_tax_rate),
    unitCost: row.unit_cost == null ? null : number(row.unit_cost),
    lineSubtotal: number(row.line_subtotal),
    lineDiscount: number(row.line_discount),
    lineTax: number(row.line_tax),
    lineOtherTax: number(row.line_other_tax),
    lineTotal: number(row.line_total),
    lineCost: row.line_cost == null ? null : number(row.line_cost),
    lineMargin: row.line_margin == null ? null : number(row.line_margin),
    lineMarginPct:
      row.line_margin_pct == null ? null : number(row.line_margin_pct),
    createdAt: String(row.created_at),
  };
};
const mapHistory = (value: unknown): SalesQuoteStatusHistory => {
  const row = record(value);
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    quoteId: String(row.quote_id),
    fromStatus: row.from_status as SalesQuoteStatusHistory["fromStatus"],
    toStatus: row.to_status as SalesQuoteStatusHistory["toStatus"],
    changedBy: String(row.changed_by),
    changedAt: String(row.changed_at),
    reason: nullable(row.reason),
    evidence: nullable(row.evidence),
  };
};

export function mapQuoteError(error: unknown): QuoteRepositoryError {
  const row = record(error);
  const code = String(row.code ?? "");
  const message = String(row.message ?? "").toLowerCase();
  if (code === "42501" || code === "PGRST301")
    return {
      code: "forbidden",
      message: "Bu teklif işlemi için şirket yetkiniz bulunmuyor.",
      cause: error,
    };
  if (code === "PGRST116" || code === "P0002")
    return { code: "not_found", message: "Teklif bulunamadı.", cause: error };
  if (
    code === "23505" ||
    code === "23514" ||
    code === "22023" ||
    message.includes("cannot") ||
    message.includes("invalid")
  )
    return {
      code: "conflict",
      message:
        "Teklif işlemi mevcut kurallarla çelişiyor. Alanları ve teklif durumunu kontrol edin.",
      cause: error,
    };
  return {
    code: "database",
    message: "Teklif işlemi tamamlanamadı. Lütfen yeniden deneyin.",
    cause: error,
  };
}
const validation = <T>(message: string): QuoteRepositoryResult<T> => ({
  data: null,
  error: { code: "validation", message, cause: null },
});
const itemPayload = (items: QuoteCreateInput["items"]) =>
  items.map((item) => ({
    position: item.position,
    item_code: item.itemCode ?? null,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    discount_type: item.discountType ?? null,
    discount_value: item.discountValue ?? 0,
    vat_rate: item.vatRate ?? 20,
    other_tax_rate: item.otherTaxRate ?? 0,
    unit_cost: item.unitCost ?? null,
  }));

export function createQuoteRepository(client: QuoteDataClient) {
  async function list<T>(
    table: string,
    companyId: string,
    mapper: (value: unknown) => T,
    configure?: (query: QuoteQuery) => QuoteQuery,
  ): Promise<QuoteRepositoryResult<T[]>> {
    let query = client.from(table).select("*").eq("company_id", companyId);
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) return { data: null, error: mapQuoteError(error) };
    return { data: (Array.isArray(data) ? data : []).map(mapper), error: null };
  }
  return {
    listSalesQuotes(
      companyId: string,
      filters: QuoteListFilters = {},
    ): Promise<QuoteRepositoryResult<SalesQuote[]>> {
      return list("sales_quotes", companyId, mapQuote, (query) => {
        let scoped = query;
        if (!filters.includeArchived) scoped = scoped.is("archived_at", null);
        if (filters.status) scoped = scoped.eq("status", filters.status);
        if (filters.partyId) scoped = scoped.eq("party_id", filters.partyId);
        if (filters.opportunityId)
          scoped = scoped.eq("opportunity_id", filters.opportunityId);
        if (filters.ownerUserId)
          scoped = scoped.eq("owner_user_id", filters.ownerUserId);
        return scoped.order("updated_at", { ascending: false });
      });
    },
    async getSalesQuote(
      companyId: string,
      quoteId: string,
    ): Promise<QuoteRepositoryResult<SalesQuote>> {
      const { data, error } = await client
        .from("sales_quotes")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", quoteId)
        .maybeSingle();
      return error
        ? { data: null, error: mapQuoteError(error) }
        : data
          ? { data: mapQuote(data), error: null }
          : {
              data: null,
              error: {
                code: "not_found",
                message: "Teklif bulunamadı.",
                cause: null,
              },
            };
    },
    listSalesQuoteVersions: (companyId: string, quoteId: string) =>
      list("sales_quote_versions", companyId, mapVersion, (q) =>
        q.eq("quote_id", quoteId).order("version_number", { ascending: false }),
      ),
    async getSalesQuoteVersion(
      companyId: string,
      versionId: string,
    ): Promise<QuoteRepositoryResult<SalesQuoteVersion>> {
      const { data, error } = await client
        .from("sales_quote_versions")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", versionId)
        .maybeSingle();
      return error
        ? { data: null, error: mapQuoteError(error) }
        : data
          ? { data: mapVersion(data), error: null }
          : {
              data: null,
              error: {
                code: "not_found",
                message: "Teklif versiyonu bulunamadı.",
                cause: null,
              },
            };
    },
    listSalesQuoteItems: (companyId: string, versionId: string) =>
      list("sales_quote_items", companyId, mapItem, (q) =>
        q
          .eq("quote_version_id", versionId)
          .order("position", { ascending: true }),
      ),
    async createSalesQuote(
      companyId: string,
      input: QuoteCreateInput,
    ): Promise<QuoteRepositoryResult<QuoteCreateResult>> {
      const checked = normalizeQuoteCreate(input);
      if (!checked.value) return validation(checked.error!);
      const value = checked.value;
      const { data, error } = await client.rpc("create_sales_quote", {
        target_company_id: companyId,
        target_party_id: value.partyId,
        target_contact_id: value.contactId ?? null,
        target_opportunity_id: value.opportunityId ?? null,
        target_owner_user_id: value.ownerUserId ?? null,
        quote_currency: value.currency ?? "TRY",
        quote_issue_date:
          value.issueDate ?? new Date().toISOString().slice(0, 10),
        quote_valid_until: value.validUntil ?? null,
        quote_payment_terms: value.paymentTerms ?? null,
        quote_delivery_terms: value.deliveryTerms ?? null,
        quote_expected_delivery_date: value.expectedDeliveryDate ?? null,
        quote_customer_notes: value.customerNotes ?? null,
        quote_internal_notes: value.internalNotes ?? null,
        quote_approval_required: value.approvalRequired ?? false,
        quote_approval_reason: value.approvalReason ?? null,
        quote_items: itemPayload(value.items),
      });
      if (error) return { data: null, error: mapQuoteError(error) };
      const row = record(Array.isArray(data) ? data[0] : data);
      return {
        data: {
          quoteId: String(row.quote_id),
          quoteNumber: String(row.quote_number),
          versionId: String(row.version_id),
        },
        error: null,
      };
    },
    async createSalesQuoteRevision(
      companyId: string,
      input: QuoteRevisionInput,
    ): Promise<QuoteRepositoryResult<QuoteRevisionResult>> {
      const checked = normalizeQuoteRevision(input);
      if (!checked.value) return validation(checked.error!);
      const value = checked.value;
      const { data, error } = await client.rpc("create_sales_quote_revision", {
        target_company_id: companyId,
        target_quote_id: value.quoteId,
        revision_note: value.revisionNote ?? null,
        replacement_items: itemPayload(value.items),
        new_valid_until: value.validUntil ?? null,
        new_payment_terms: value.paymentTerms ?? null,
        new_delivery_terms: value.deliveryTerms ?? null,
        new_expected_delivery_date: value.expectedDeliveryDate ?? null,
        new_customer_notes: value.customerNotes ?? null,
        new_internal_notes: value.internalNotes ?? null,
      });
      if (error) return { data: null, error: mapQuoteError(error) };
      const row = record(Array.isArray(data) ? data[0] : data);
      return {
        data: {
          versionId: String(row.version_id),
          versionNumber: number(row.version_number),
        },
        error: null,
      };
    },
    async transitionSalesQuoteStatus(
      companyId: string,
      input: QuoteTransitionInput,
    ): Promise<QuoteRepositoryResult<SalesQuote>> {
      const checked = normalizeQuoteTransition(input);
      if (!checked.value) return validation(checked.error!);
      const { data, error } = await client.rpc(
        "transition_sales_quote_status",
        {
          target_company_id: companyId,
          target_quote_id: checked.value.quoteId,
          destination_status: checked.value.destinationStatus,
          transition_reason: checked.value.reason ?? null,
          transition_evidence: checked.value.evidence ?? null,
        },
      );
      return error
        ? { data: null, error: mapQuoteError(error) }
        : { data: mapQuote(data), error: null };
    },
    async archiveSalesQuote(
      companyId: string,
      quoteId: string,
    ): Promise<QuoteRepositoryResult<SalesQuote>> {
      const { data, error } = await client.rpc("archive_sales_quote", {
        target_company_id: companyId,
        target_quote_id: quoteId,
      });
      return error
        ? { data: null, error: mapQuoteError(error) }
        : { data: mapQuote(data), error: null };
    },
    listSalesQuoteStatusHistory: (companyId: string, quoteId: string) =>
      list("sales_quote_status_history", companyId, mapHistory, (q) =>
        q.eq("quote_id", quoteId).order("changed_at", { ascending: false }),
      ),
  };
}

export const quoteRepository = createQuoteRepository(
  supabase as unknown as QuoteDataClient,
);
export const {
  listSalesQuotes,
  getSalesQuote,
  listSalesQuoteVersions,
  getSalesQuoteVersion,
  listSalesQuoteItems,
  createSalesQuote,
  createSalesQuoteRevision,
  transitionSalesQuoteStatus,
  archiveSalesQuote,
  listSalesQuoteStatusHistory,
} = quoteRepository;
