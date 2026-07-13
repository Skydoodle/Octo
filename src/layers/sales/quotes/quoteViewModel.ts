import type { SalesQuote, SalesQuoteStatus, SalesQuoteVersion } from "./types";

export const quoteStatusLabels: Record<SalesQuoteStatus, string> = {
  draft: "Taslak",
  pending_approval: "Onay bekliyor",
  sent: "Gönderildi",
  viewed: "Görüntülendi",
  revision_requested: "Revizyon istendi",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
};
export const terminalQuoteStatuses: SalesQuoteStatus[] = [
  "accepted",
  "rejected",
  "expired",
  "cancelled",
];
export const isQuoteTerminal = (status: SalesQuoteStatus) =>
  terminalQuoteStatuses.includes(status);
export const isQuoteOpen = (status: SalesQuoteStatus) =>
  !isQuoteTerminal(status);
export const isQuoteExpired = (
  quote: Pick<SalesQuote, "validUntil" | "status">,
  now = new Date(),
) =>
  quote.status === "expired" ||
  (!!quote.validUntil && new Date(`${quote.validUntil}T23:59:59`) < now);
export const daysUntilQuoteExpiry = (
  validUntil: string | null,
  now = new Date(),
) =>
  validUntil
    ? Math.ceil(
        (new Date(`${validUntil}T23:59:59`).getTime() - now.getTime()) /
          86400000,
      )
    : null;
export const selectCurrentQuoteVersion = (versions: SalesQuoteVersion[]) =>
  versions.find((version) => version.isCurrent) ?? null;
export const formatQuoteCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
export const quotationDisplayNumber = (
  quoteNumber: string | null | undefined,
) => quoteNumber?.trim() || "Numara bekleniyor";
