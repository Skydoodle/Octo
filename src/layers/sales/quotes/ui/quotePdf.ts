import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { Company } from "../../../../company/companyContext";
import type { BusinessContact, BusinessParty } from "../../crm/types";
import type { SalesQuote, SalesQuoteItem, SalesQuoteVersion } from "../types";
import { formatQuoteCurrency, quoteStatusLabels } from "../quoteViewModel";

export interface QuotePdfData {
  seller: Pick<Company, "name">;
  quote: SalesQuote;
  version: SalesQuoteVersion;
  items: SalesQuoteItem[];
  party: BusinessParty;
  contact: BusinessContact | null;
  generatedAt?: Date;
}
export function sanitizeQuotePdfFilename(number: string, version: number) {
  const safe = number
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `Teklif_${safe || "Belge"}_v${version}.pdf`;
}
const date = (v: string | null) =>
  v ? new Intl.DateTimeFormat("tr-TR").format(new Date(`${v}T12:00:00`)) : "—";
export function buildQuotePdfDefinition(d: QuotePdfData): TDocumentDefinitions {
  const money = (v: number) => formatQuoteCurrency(v, d.quote.currency);
  const customer = [
    d.party.legalName || d.party.displayName,
    d.party.taxId && `VKN / TCKN: ${d.party.taxId}`,
    d.party.taxOffice && `Vergi dairesi: ${d.party.taxOffice}`,
    d.party.address,
    d.contact &&
      `İlgili kişi: ${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim(),
    d.contact?.email,
    d.contact?.phone,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    pageSize: "A4",
    pageMargins: [42, 52, 42, 58],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#292626" },
    header: {
      margin: [42, 20],
      columns: [
        { text: "OCTO", bold: true, fontSize: 17, color: "#A30D2D" },
        {
          text: `TEKLİF  ·  ${d.quote.quoteNumber}`,
          alignment: "right",
          bold: true,
        },
      ],
    },
    footer: (current, page) => ({
      margin: [42, 12],
      columns: [
        {
          text: `${d.quote.quoteNumber} · ${new Intl.DateTimeFormat("tr-TR").format(d.generatedAt ?? new Date())}`,
          fontSize: 8,
          color: "#666",
        },
        {
          text: `Sayfa ${current} / ${page}`,
          alignment: "right",
          fontSize: 8,
          color: "#666",
        },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: "55%",
            stack: [
              { text: d.seller.name, bold: true, fontSize: 13 },
              { text: "Satıcı şirket" },
            ],
          },
          {
            width: "45%",
            table: {
              widths: ["*", "auto"],
              body: [
                ["Versiyon", `v${d.version.versionNumber}`],
                ["Durum", quoteStatusLabels[d.quote.status]],
                ["Düzenleme", date(d.quote.issueDate)],
                ["Geçerlilik", date(d.quote.validUntil)],
              ],
            },
            layout: "noBorders",
          },
        ],
      },
      { text: "MÜŞTERİ", style: "section" },
      { text: customer },
      { text: "KALEMLER", style: "section" },
      {
        table: {
          headerRows: 1,
          widths: [18, "*", 38, 36, 58, 42, 34, 62],
          body: [
            [
              "#",
              "Açıklama",
              "Miktar",
              "Birim",
              "Birim fiyat",
              "İndirim",
              "KDV",
              "Toplam",
            ],
            ...d.items.map((i) => [
              i.position,
              i.description,
              i.quantity,
              i.unit,
              money(i.unitPrice),
              i.discountType
                ? `${i.discountValue}${i.discountType === "percentage" ? "%" : ""}`
                : "—",
              `%${i.vatRate}`,
              money(i.lineTotal),
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        margin: [260, 14, 0, 0],
        table: {
          widths: ["*", "auto"],
          body: [
            ["Ara toplam", money(d.version.subtotal)],
            ["İndirim", money(d.version.discountTotal)],
            ["KDV", money(d.version.taxTotal)],
            ["Diğer vergi", money(d.version.otherTaxTotal)],
            [
              { text: "GENEL TOPLAM", bold: true },
              {
                text: money(d.version.grandTotal),
                bold: true,
                color: "#A30D2D",
              },
            ],
          ],
        },
        layout: "noBorders",
      },
      { text: "TİCARİ KOŞULLAR", style: "section" },
      {
        text:
          [
            d.quote.paymentTerms && `Ödeme: ${d.quote.paymentTerms}`,
            d.quote.deliveryTerms && `Teslimat: ${d.quote.deliveryTerms}`,
            d.quote.expectedDeliveryDate &&
              `Beklenen teslimat: ${date(d.quote.expectedDeliveryDate)}`,
            d.quote.customerNotes,
          ]
            .filter(Boolean)
            .join("\n") || "—",
      },
      {
        margin: [0, 26, 0, 0],
        columns: [
          {
            text: "Müşteri kabulü / imza\n\nAd Soyad: ____________________\nİmza: ________________________",
          },
          {
            text: d.quote.validUntil
              ? `Bu teklif ${date(d.quote.validUntil)} tarihine kadar geçerlidir.`
              : "Geçerlilik tarihi belirtilmemiştir.",
            alignment: "right",
          },
        ],
      },
    ],
    styles: {
      section: {
        fontSize: 10,
        bold: true,
        color: "#A30D2D",
        margin: [0, 18, 0, 7],
      },
    },
  };
}
async function pdfMake() {
  const [{ default: maker }, { default: vfs }] = await Promise.all([
    import("pdfmake/build/pdfmake.js"),
    import("pdfmake/build/vfs_fonts.js"),
  ]);
  maker.vfs = vfs as unknown as Record<string, string>;
  return maker;
}
export async function quotePdfBlob(data: QuotePdfData) {
  const maker = await pdfMake();
  return new Promise<Blob>((resolve) =>
    maker.createPdf(buildQuotePdfDefinition(data)).getBlob(resolve),
  );
}
export async function downloadQuotePdf(data: QuotePdfData) {
  const maker = await pdfMake();
  maker
    .createPdf(buildQuotePdfDefinition(data))
    .download(
      sanitizeQuotePdfFilename(
        data.quote.quoteNumber,
        data.version.versionNumber,
      ),
    );
}
