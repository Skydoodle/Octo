import type { BusinessParty, BusinessContact } from "../../crm/types";
import type { SalesOpportunity } from "../../execution/types";
import type { SalesQuote, SalesQuoteStatus, SalesQuoteVersion } from "../types";
import { daysUntilQuoteExpiry, isQuoteExpired } from "../quoteViewModel";

export interface QuoteFilters {
  search: string;
  status: string;
  owner: string;
  party: string;
  opportunity: string;
  currency: string;
  issueFrom: string;
  issueTo: string;
  validFrom: string;
  validTo: string;
  expiring: boolean;
  expired: boolean;
  approval: boolean;
  archived: boolean;
}
export const emptyQuoteFilters: QuoteFilters = {
  search: "",
  status: "",
  owner: "",
  party: "",
  opportunity: "",
  currency: "",
  issueFrom: "",
  issueTo: "",
  validFrom: "",
  validTo: "",
  expiring: false,
  expired: false,
  approval: false,
  archived: false,
};
export function filterQuotes(
  rows: SalesQuote[],
  versions: Map<string, SalesQuoteVersion>,
  parties: Map<string, BusinessParty>,
  f: QuoteFilters,
  now = new Date(),
) {
  const q = f.search.trim().toLocaleLowerCase("tr-TR");
  return rows.filter(
    (r) =>
      (f.archived || !r.archivedAt) &&
      (!f.status || r.status === f.status) &&
      (!f.owner || r.ownerUserId === f.owner) &&
      (!f.party || r.partyId === f.party) &&
      (!f.opportunity || r.opportunityId === f.opportunity) &&
      (!f.currency || r.currency === f.currency) &&
      (!f.issueFrom || r.issueDate >= f.issueFrom) &&
      (!f.issueTo || r.issueDate <= f.issueTo) &&
      (!f.validFrom || (!!r.validUntil && r.validUntil >= f.validFrom)) &&
      (!f.validTo || (!!r.validUntil && r.validUntil <= f.validTo)) &&
      (!f.expiring ||
        ((daysUntilQuoteExpiry(r.validUntil, now) ?? 99) >= 0 &&
          (daysUntilQuoteExpiry(r.validUntil, now) ?? 99) <= 7)) &&
      (!f.expired || isQuoteExpired(r, now)) &&
      (!f.approval || r.approvalRequired) &&
      (!q ||
        r.quoteNumber.toLocaleLowerCase("tr-TR").includes(q) ||
        (parties.get(r.partyId)?.displayName ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(q)) &&
      (!r.currentVersionId || versions.has(r.currentVersionId)),
  );
}
export const canWriteQuotes = (role: string | null | undefined) =>
  role === "owner" || role === "employee";
export function quoteActions(
  status: SalesQuoteStatus,
  approvalRequired: boolean,
  approved: boolean,
  isOwner: boolean,
) {
  const actions: SalesQuoteStatus[] = [];
  if (status === "draft") {
    actions.push("pending_approval");
    if (!approvalRequired || approved) actions.push("sent");
    actions.push("cancelled");
  }
  if (status === "pending_approval") {
    actions.push("draft");
    if (isOwner) actions.push("sent");
    actions.push("cancelled");
  }
  if (status === "sent")
    actions.push(
      "viewed",
      "revision_requested",
      "accepted",
      "rejected",
      "expired",
      "cancelled",
    );
  if (status === "viewed")
    actions.push(
      "revision_requested",
      "accepted",
      "rejected",
      "expired",
      "cancelled",
    );
  if (status === "revision_requested") actions.push("draft", "cancelled");
  return actions;
}
export const contactOptions = (contacts: BusinessContact[], partyId: string) =>
  contacts.filter((c) => c.partyId === partyId && !c.archivedAt);
export const opportunityOptions = (
  opportunities: SalesOpportunity[],
  partyId: string,
) => opportunities.filter((o) => o.partyId === partyId && !o.archivedAt);
