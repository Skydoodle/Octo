import type { QuoteItemInput } from "./types";
import { normalizeQuoteItem } from "./validation";

export const roundQuote = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return (
    (Math.sign(value) *
      Math.round((Math.abs(value) + Number.EPSILON) * factor)) /
    factor
  );
};
export interface QuoteLineCalculation {
  lineSubtotal: number;
  lineDiscount: number;
  taxableAmount: number;
  lineTax: number;
  lineOtherTax: number;
  lineTotal: number;
  lineCost: number | null;
  lineMargin: number | null;
  lineMarginPct: number | null;
}
export interface QuoteVersionCalculation {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  otherTaxTotal: number;
  grandTotal: number;
  totalCost: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
}

export function calculateQuoteLine(
  input: QuoteItemInput,
): QuoteLineCalculation {
  const checked = normalizeQuoteItem(input);
  if (!checked.value)
    throw new Error(checked.error ?? "Geçersiz teklif kalemi.");
  const item = checked.value;
  const lineSubtotal = roundQuote(item.quantity * item.unitPrice);
  const lineDiscount = roundQuote(
    item.discountType === "percentage"
      ? (lineSubtotal * (item.discountValue ?? 0)) / 100
      : item.discountType === "fixed"
        ? (item.discountValue ?? 0)
        : 0,
  );
  if (lineDiscount > lineSubtotal)
    throw new Error("İndirim kalem tutarını aşamaz.");
  const taxableAmount = roundQuote(lineSubtotal - lineDiscount);
  const lineTax = roundQuote((taxableAmount * (item.vatRate ?? 20)) / 100);
  const lineOtherTax = roundQuote(
    (taxableAmount * (item.otherTaxRate ?? 0)) / 100,
  );
  const lineTotal = roundQuote(taxableAmount + lineTax + lineOtherTax);
  const lineCost =
    item.unitCost == null ? null : roundQuote(item.quantity * item.unitCost);
  const lineMargin =
    lineCost == null ? null : roundQuote(taxableAmount - lineCost);
  const lineMarginPct =
    lineMargin == null || taxableAmount === 0
      ? null
      : roundQuote((lineMargin / taxableAmount) * 100, 4);
  return {
    lineSubtotal,
    lineDiscount,
    taxableAmount,
    lineTax,
    lineOtherTax,
    lineTotal,
    lineCost,
    lineMargin,
    lineMarginPct,
  };
}

export function calculateQuoteVersion(
  items: QuoteItemInput[],
): QuoteVersionCalculation {
  if (!items.length) throw new Error("En az bir teklif kalemi gereklidir.");
  const lines = items.map(calculateQuoteLine);
  const subtotal = roundQuote(
    lines.reduce((sum, line) => sum + line.lineSubtotal, 0),
  );
  const discountTotal = roundQuote(
    lines.reduce((sum, line) => sum + line.lineDiscount, 0),
  );
  const taxTotal = roundQuote(
    lines.reduce((sum, line) => sum + line.lineTax, 0),
  );
  const otherTaxTotal = roundQuote(
    lines.reduce((sum, line) => sum + line.lineOtherTax, 0),
  );
  const grandTotal = roundQuote(
    lines.reduce((sum, line) => sum + line.lineTotal, 0),
  );
  const allCosts = lines.every((line) => line.lineCost != null);
  const totalCost = allCosts
    ? roundQuote(lines.reduce((sum, line) => sum + (line.lineCost ?? 0), 0))
    : null;
  const taxableTotal = roundQuote(subtotal - discountTotal);
  const grossMargin =
    totalCost == null ? null : roundQuote(taxableTotal - totalCost);
  const grossMarginPct =
    grossMargin == null || taxableTotal === 0
      ? null
      : roundQuote((grossMargin / taxableTotal) * 100, 4);
  return {
    subtotal,
    discountTotal,
    taxTotal,
    otherTaxTotal,
    grandTotal,
    totalCost,
    grossMargin,
    grossMarginPct,
  };
}
