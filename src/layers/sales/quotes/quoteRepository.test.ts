import { describe, expect, it, vi } from "vitest";
import migration from "../../../../supabase/migrations/20260713170000_quotations_data_foundation_v1.sql?raw";
import {
  createQuoteRepository,
  mapQuoteError,
  type QuoteDataClient,
} from "./quoteRepository";
import {
  normalizeQuoteCreate,
  normalizeQuoteItem,
  normalizeQuoteTransition,
} from "./validation";

class Query implements PromiseLike<{ data: unknown; error: unknown | null }> {
  ops: Array<[string, ...unknown[]]> = [];
  constructor(
    private response = { data: [] as unknown, error: null as unknown | null },
  ) {}
  select(v: string) {
    this.ops.push(["select", v]);
    return this;
  }
  eq(a: string, b: unknown) {
    this.ops.push(["eq", a, b]);
    return this;
  }
  is(a: string, b: null) {
    this.ops.push(["is", a, b]);
    return this;
  }
  order(a: string, b?: { ascending?: boolean }) {
    this.ops.push(["order", a, b]);
    return this;
  }
  maybeSingle() {
    this.ops.push(["maybeSingle"]);
    return Promise.resolve(this.response);
  }
  then<A = { data: unknown; error: unknown | null }, B = never>(
    ok?:
      | ((v: { data: unknown; error: unknown | null }) => A | PromiseLike<A>)
      | null,
    bad?: ((r: unknown) => B | PromiseLike<B>) | null,
  ) {
    return Promise.resolve(this.response).then(ok, bad);
  }
}
class Client {
  queries: Array<{ table: string; query: Query }> = [];
  rpc = vi.fn(async (...args: [string, Record<string, unknown>]) => {
    void args;
    return {
      data: [
        {
          quote_id: "q",
          quote_number: "TKL-2026-000001",
          version_id: "v",
          version_number: 2,
        },
      ],
      error: null,
    };
  });
  constructor(
    private responses: Array<{ data: unknown; error: unknown | null }> = [],
  ) {}
  from(table: string) {
    const query = new Query(this.responses.shift());
    this.queries.push({ table, query });
    return query;
  }
}
const validItem = {
  position: 1,
  description: "Hizmet",
  quantity: 1,
  unit: "adet",
  unitPrice: 100,
};

describe("quotation input validation", () => {
  it("requires party, items and valid issue/validity dates", () => {
    expect(
      normalizeQuoteCreate({ partyId: "", items: [validItem] }).error,
    ).toContain("Firma");
    expect(normalizeQuoteCreate({ partyId: "p", items: [] }).error).toContain(
      "kalemi",
    );
    expect(
      normalizeQuoteCreate({
        partyId: "p",
        issueDate: "2026-07-13",
        validUntil: "2026-07-12",
        items: [validItem],
      }).error,
    ).toContain("önce");
  });
  it("validates quantities, units, prices, discounts, VAT, other tax and costs", () => {
    expect(normalizeQuoteItem({ ...validItem, quantity: 0 }).error).toContain(
      "Miktar",
    );
    expect(
      normalizeQuoteItem({
        ...validItem,
        discountType: "percentage",
        discountValue: 101,
      }).error,
    ).toContain("100");
    expect(normalizeQuoteItem({ ...validItem, vatRate: -1 }).error).toContain(
      "geçersiz",
    );
    expect(normalizeQuoteItem({ ...validItem, unitCost: -1 }).error).toContain(
      "geçersiz",
    );
  });
  it("requires acceptance evidence and rejection or cancellation reasons", () => {
    expect(
      normalizeQuoteTransition({ quoteId: "q", destinationStatus: "accepted" })
        .error,
    ).toContain("kanıtı");
    expect(
      normalizeQuoteTransition({ quoteId: "q", destinationStatus: "rejected" })
        .error,
    ).toContain("neden");
    expect(
      normalizeQuoteTransition({ quoteId: "q", destinationStatus: "cancelled" })
        .error,
    ).toContain("neden");
  });
});

describe("quotation repository", () => {
  it("scopes quote lists to the active company and excludes archives by default", async () => {
    const client = new Client();
    await createQuoteRepository(
      client as unknown as QuoteDataClient,
    ).listSalesQuotes("company");
    expect(client.queries[0].query.ops).toContainEqual([
      "eq",
      "company_id",
      "company",
    ]);
    expect(client.queries[0].query.ops).toContainEqual([
      "is",
      "archived_at",
      null,
    ]);
  });
  it("includes archived quotations only explicitly", async () => {
    const client = new Client();
    await createQuoteRepository(
      client as unknown as QuoteDataClient,
    ).listSalesQuotes("company", { includeArchived: true });
    expect(client.queries[0].query.ops).not.toContainEqual([
      "is",
      "archived_at",
      null,
    ]);
  });
  it("uses the atomic create RPC without client totals or quote numbers", async () => {
    const client = new Client();
    const result = await createQuoteRepository(
      client as unknown as QuoteDataClient,
    ).createSalesQuote("company", { partyId: "party", items: [validItem] });
    expect(result.data).toEqual({
      quoteId: "q",
      quoteNumber: "TKL-2026-000001",
      versionId: "v",
    });
    const payload = client.rpc.mock.calls[0][1];
    expect(client.rpc).toHaveBeenCalledWith(
      "create_sales_quote",
      expect.objectContaining({
        target_company_id: "company",
        target_party_id: "party",
      }),
    );
    expect(payload).not.toHaveProperty("quote_number");
    expect(payload).not.toHaveProperty("grand_total");
  });
  it("uses one atomic revision RPC with a complete replacement item set", async () => {
    const client = new Client();
    const result = await createQuoteRepository(
      client as unknown as QuoteDataClient,
    ).createSalesQuoteRevision("company", {
      quoteId: "q",
      revisionNote: "Güncelleme",
      items: [validItem],
    });
    expect(result.data).toEqual({ versionId: "v", versionNumber: 2 });
    expect(client.rpc).toHaveBeenCalledWith(
      "create_sales_quote_revision",
      expect.objectContaining({
        target_quote_id: "q",
        replacement_items: [expect.objectContaining({ description: "Hizmet" })],
      }),
    );
  });
  it("uses controlled transition and archive RPCs", async () => {
    const client = new Client();
    const repo = createQuoteRepository(client as unknown as QuoteDataClient);
    await repo.transitionSalesQuoteStatus("company", {
      quoteId: "q",
      destinationStatus: "sent",
    });
    await repo.archiveSalesQuote("company", "q");
    expect(client.rpc).toHaveBeenNthCalledWith(
      1,
      "transition_sales_quote_status",
      expect.objectContaining({ destination_status: "sent" }),
    );
    expect(client.rpc).toHaveBeenNthCalledWith(2, "archive_sales_quote", {
      target_company_id: "company",
      target_quote_id: "q",
    });
  });
  it("maps errors safely while preserving the raw cause", () => {
    const cause = { code: "42501", message: "private database detail" };
    expect(mapQuoteError(cause)).toEqual({
      code: "forbidden",
      message: "Bu teklif işlemi için şirket yetkiniz bulunmuyor.",
      cause,
    });
    expect(
      mapQuoteError({ code: "23514", message: "invalid transition" }).code,
    ).toBe("conflict");
  });
});

describe("quotation migration contract", () => {
  it("creates all five company-scoped tables", () => {
    for (const table of [
      "sales_quotes",
      "sales_quote_versions",
      "sales_quote_items",
      "sales_quote_status_history",
      "sales_quote_number_counters",
    ])
      expect(migration).toContain(`create table public.${table}`);
  });
  it("generates company/year-scoped race-safe numbers and resets by calendar year", () => {
    expect(migration).toContain(
      "'TKL-'||target_year::text||'-'||lpad(allocated_number::text,6,'0')",
    );
    expect(migration).toContain(
      "on conflict(company_id,calendar_year) do update",
    );
    expect(migration).toContain("primary key (company_id, calendar_year)");
  });
  it("enforces party/contact, party/opportunity and active-owner consistency", () => {
    expect(migration).toContain("Quote contact must belong to selected party");
    expect(migration).toContain(
      "Quote opportunity must belong to selected party",
    );
    expect(migration).toContain("Quote owner must be an active company member");
  });
  it("calculates every total server-side using numeric rounding", () => {
    for (const token of [
      "calculated_subtotal:=round",
      "calculated_discount:=round",
      "calculated_vat:=round",
      "calculated_other_tax:=round",
      "calculated_margin_pct:=case",
    ])
      expect(migration).toContain(token);
    expect(migration).toContain("Quote item discount exceeds subtotal");
  });
  it("creates quote, version one, items and initial history in one atomic function", () => {
    expect(migration).toContain(
      "create or replace function public.create_sales_quote",
    );
    expect(migration).toContain(
      "created_version_id:=public.insert_sales_quote_version",
    );
    expect(migration).toContain("created_quote_id,1,null,quote_items");
    expect(migration).toContain("null,'draft',actor_id");
  });
  it("keeps old versions immutable and permits only one current version", () => {
    expect(migration).toContain("sales_quote_versions_one_current");
    expect(migration).toContain("Quote versions are immutable");
    expect(migration).toContain("set is_current=false");
    expect(migration).not.toMatch(
      /grant update on table public\.sales_quote_versions/,
    );
  });
  it("serializes revision numbering and rejects terminal revisions", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "quote_row.status in ('accepted','rejected','expired','cancelled')",
    );
    expect(migration).toContain("max(v.version_number),0)+1");
  });
  it("implements the explicit transition map and terminal states", () => {
    expect(migration).toContain(
      "when 'draft' then destination_status in ('pending_approval','sent','cancelled')",
    );
    expect(migration).toContain(
      "when 'revision_requested' then destination_status in ('draft','cancelled') else false",
    );
    expect(migration).toContain("Invalid quote status transition");
  });
  it("requires evidence/reasons and records exactly one history row per transition", () => {
    expect(migration).toContain("Acceptance evidence or reason is required");
    expect(migration).toContain("Transition reason is required");
    const transition = migration.slice(
      migration.indexOf(
        "create or replace function public.transition_sales_quote_status",
      ),
      migration.indexOf(
        "create or replace function public.archive_sales_quote",
      ),
    );
    expect(
      transition.match(/insert into public\.sales_quote_status_history/g),
    ).toHaveLength(1);
  });
  it("limits approval to owners and never creates a sales order", () => {
    expect(migration).toContain("Only an owner may approve a quote");
    expect(migration).not.toContain("sales_orders");
  });
  it("keeps accountants read-only, anonymous denied, counters private and hard deletes unavailable", () => {
    expect(migration).toContain("grant select on table public.sales_quotes");
    expect(migration).not.toMatch(
      /grant (insert|update|delete) on table public\.sales_quotes/,
    );
    expect(migration).toContain("from public,anon,authenticated");
    expect(migration).not.toContain(
      "grant select on table public.sales_quote_number_counters",
    );
  });
  it("uses RLS company isolation and controlled authenticated RPC grants", () => {
    expect(migration.match(/enable row level security/g)).toHaveLength(5);
    expect(migration).toContain("using(public.is_company_member(company_id))");
    expect(migration).toContain(
      "grant execute on function public.create_sales_quote",
    );
  });
});
