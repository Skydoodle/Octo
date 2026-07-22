import { describe, expect, it } from "vitest";
import appSource from "../../../../App.tsx?raw";
import opportunitySource from "../../execution/ui/OpportunityPages.tsx?raw";
import quoteSource from "../../quotes/ui/QuotePages.tsx?raw";
import workbenchSource from "../../workbench/SalesWorkbenchPage.tsx?raw";
import pageSource from "./AssistedExecutionPages.tsx?raw";

describe("Quote Preparation Assistant V1 interface", () => {
  it("registers protected nested list, creation, and detail routes", () => {
    for (const route of [
      'path="hazirlanan-isler"',
      'path="hazirlanan-isler/yeni"',
      'path="hazirlanan-isler/:caseId"',
    ])
      expect(appSource).toContain(route);
  });
  it("offers explicit preparation from opportunity, quotation, and workbench contexts", () => {
    expect(opportunitySource).toContain("Octo ile teklif hazırla");
    expect(quoteSource).toContain("Octo ile hazırla");
    expect(workbenchSource).toContain("Teklif hazırla");
  });
  it("separates evidence, assumptions, missing inputs, prepared terms, and final decision", () => {
    for (const label of [
      "Kanıt",
      "Varsayımlar",
      "Eksik bilgiler",
      "Önerilen koşullar",
      "Son karar",
    ])
      expect(pageSource).toContain(`title="${label}"`);
  });
  it("exposes loading, error, empty, retry, and accountant read-only states", () => {
    for (const label of [
      "Hazırlanmış işler yükleniyor…",
      "Hazırlanmış işler yüklenemedi.",
      "Henüz hazırlanmış iş yok",
      "retry",
      "salt okunur",
    ])
      expect(pageSource.toLocaleLowerCase("tr-TR")).toContain(
        label.toLocaleLowerCase("tr-TR"),
      );
  });
  it("requires a rejection category and displays original-versus-final edits", () => {
    expect(pageSource).toContain("Ret nedeni seçin");
    expect(pageSource).toContain("Özgün ve son taslak karşılaştırması");
    expect(pageSource).toMatch(/disabled=\{busy\s*\|\|\s*!rejectReason\}/);
  });
  it("keeps comparable commercial context inspectable and supports line review", () => {
    for (const label of [
      "Kaynak kaydı aç",
      "Ödeme koşulu:",
      "Geçerlilik:",
      "Tarihsel indirim bağlamı",
      "Örneklem:",
      "Kalem ekle",
      "Kalemi kaldır",
    ])
      expect(pageSource).toContain(label);
  });
  it("does not provide automatic sending, autonomous pricing, stock, or margin claims", () => {
    expect(pageSource).toContain("Otomatik gönderim yoktur");
    expect(pageSource).toContain("marj değerlendirilmedi");
    expect(pageSource).not.toMatch(
      /sendEmail|sendMessage|stockAvailable|marginSafe|acceptanceProbability/,
    );
  });
  it("keeps mutation operations in the repository boundary", () => {
    expect(pageSource).not.toMatch(/supabase|\.from\(/);
    for (const operation of [
      "prepareQuoteCase",
      "resolveExecutionMissingInput",
      "saveQuoteExecutionReview",
      "approveQuoteExecutionCase",
      "retryQuoteExecutionCase",
      "decideExecutionCase",
    ])
      expect(pageSource).toContain(operation);
  });
});
