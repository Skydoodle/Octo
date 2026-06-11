import { getFinanceState } from '../layers/finance/financeStore'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../layers/finance/logic/arAging'
import { calculateAPSchedule } from '../layers/finance/logic/apSchedule'
import { knownObligations } from '../layers/finance/logic/cashProjection'
import { getTaxState } from '../layers/tax/taxStore'
import { getUpcomingObligations, getTotalTaxOwed, calculateComplianceScore, detectDeadlineClusters } from '../layers/tax/logic/taxLogic'

export type Aciliyet = 'kritik' | 'dikkat' | 'stabil' | 'notr'

export interface BriefingKol {
  kol: string
  aciliyet: Aciliyet
  metin: string
}

export interface Briefing {
  ozet: string
  kollar: BriefingKol[]
}

export function buildContext(): string {
  const { accounts: mockAccounts, invoices: mockInvoices, transactions: mockTransactions } = getFinanceState()
  const { beyannameler: mockBeyannameler, compliance: mockCompliance } = getTaxState()
  // FINANS
  const cash = calculateCashPosition(mockAccounts)
  const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(mockInvoices)
  const overdueReceivables = getOverdueReceivables(mockInvoices)
  const apSchedule = calculateAPSchedule(mockInvoices)

  const today = new Date()
  const finUpcoming = knownObligations
    .map(o => ({ ...o, daysUntil: Math.floor((new Date(o.date).getTime() - today.getTime()) / 86400000) }))
    .filter(o => o.daysUntil >= 0 && o.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const overdueInvoices = mockInvoices.filter(inv => inv.type === 'sales' && inv.status === 'overdue')
  const urgentPayables = apSchedule.filter(item => item.daysUntilDue <= 7)

  // VERGI
  const taxOwed = getTotalTaxOwed(mockBeyannameler)
  const taxUpcoming = getUpcomingObligations(mockBeyannameler, 30)
  const complianceScore = calculateComplianceScore(mockCompliance)
  const clusters = detectDeadlineClusters(mockBeyannameler)

  return `Bugun: ${today.toLocaleDateString('tr-TR')}

== FINANS ==
- Net nakit: ${Math.round(cash.netCash).toLocaleString('tr-TR')} TL
- Nakit pisti: ${runway} ay
- Toplam alacak: ${Math.round(totalReceivables).toLocaleString('tr-TR')} TL
- Gecikmis alacak: ${Math.round(overdueReceivables).toLocaleString('tr-TR')} TL
- Aylik gider: ${Math.round(monthlyExpenses).toLocaleString('tr-TR')} TL

FINANS YAKLASAN ODEMELER (30 gun):
${finUpcoming.map(o => `- ${o.description}: ${o.amount.toLocaleString('tr-TR')} TL (${o.daysUntil} gun sonra)`).join('\n') || 'Yok'}

GECIKMIS FATURALAR:
${overdueInvoices.map(inv => `- ${inv.contactName}: ${inv.total.toLocaleString('tr-TR')} TL`).join('\n') || 'Yok'}

ACIL ODEMELER (7 gun):
${urgentPayables.map(item => `- ${item.invoice.contactName}: ${item.invoice.total.toLocaleString('tr-TR')} TL (${item.daysUntilDue} gun)`).join('\n') || 'Yok'}

== VERGI ==
- Toplam vergi yuku (odenmemis): ${Math.round(taxOwed).toLocaleString('tr-TR')} TL
- Uyumluluk skoru: ${complianceScore}/100

VERGI YAKLASAN BEYANNAMELER (30 gun):
${taxUpcoming.map(o => `- ${o.label}: ${o.amount.toLocaleString('tr-TR')} TL (${o.daysUntil} gun sonra, son tarih ${o.sonTarih})`).join('\n') || 'Yok'}

VERGI YIGILMA UYARISI (ayni haftaya denk gelen beyannameler):
${clusters.length > 0 ? clusters.map(c => `- ${c.hafta} araliginda ${c.sayi} beyanname, toplam ${c.toplam.toLocaleString('tr-TR')} TL`).join('\n') : 'Yigilma yok'}

ONEMLI: Eger Finans odemeleri (SGK gibi) ile Vergi beyannameleri (KDV, Muhtasar gibi) ayni haftaya denk geliyorsa, bunu bir capraz-katman riski olarak vurgula. Toplam nakit cikisini hesapla ve nakit pozisyonuyla karsilastir.`
}

const SYSTEM_PROMPT = `Sen Octo'sun, Turk KOBI'leri icin yapay zeka is asistani. Asagidaki Finans ve Vergi verilerini birlikte okuyup sabah brifingi hazirlayacaksin.

ROLUN: Ayni anda mali musavir, IK analisti ve genel mudur gibi dusunursun. En degerli katkin: farkli katmanlari (Finans + Vergi) birlikte gorup, tek basina gorunmeyen riskleri yakalamak. Ornegin SGK odemesi ile KDV beyannamesi ayni haftaya denk geliyorsa, bunu vurgula.

YAZIM KURALLARI:
- Cumleler kisa ve yogun olsun; baglac yerine noktali virgul kullan.
- Sayisal verileri oldugu gibi koru, birim (TL, %, gun) her zaman belirt.
- Teknik ama sade dil kullan; KOBI sahibi de anlasin.
- Em dash, parantez, madde isareti kullanma. Duz cumle yaz.
- Zaman ifadelerini cumle sonuna tasi.
- Yorum ekleme, sadece veriyi ozetle.

CUMLE FORMATI:
[Pozisyon/durum cumlesi]; [baglam veya karsilastirma]. [Yaklasan hareket cumlesi.]

ACILIYET SEVIYELERI:
- "kritik": 2-3 gun icinde son tarih veya nakit riski
- "dikkat": yaklasan ama acil olmayan (1-2 hafta)
- "stabil": iyi durumda, sadece bilgi
- "notr": pasif veya beklemede

CIKTI FORMATI: SADECE su JSON yapisinda yanit ver, baska hicbir sey yazma:
{
  "ozet": "Tek cumlelik genel ozet; bu hafta neye dikkat edilmeli. Eger capraz-katman riski varsa onu vurgula.",
  "kollar": [
    { "kol": "Finans", "aciliyet": "kritik", "metin": "..." },
    { "kol": "Vergi", "aciliyet": "dikkat", "metin": "..." }
  ]
}

Sadece veride karsiligi olan kollari ekle. Eger Finans ve Vergi arasinda bir cakisma varsa, ozet cumlesinde bunu mutlaka belirt.`

export async function generateBriefing(apiKey: string): Promise<Briefing> {
  const context = buildContext()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`)

  const data = await response.json()
  const raw = data.choices[0]?.message?.content || '{}'
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    ozet: parsed.ozet || 'Brifing olusturulamadi.',
    kollar: Array.isArray(parsed.kollar) ? parsed.kollar : [],
  }
}
