import { mockAccounts, mockInvoices, mockTransactions } from '../layers/finance/mockData'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../layers/finance/logic/arAging'
import { calculateAPSchedule } from '../layers/finance/logic/apSchedule'
import { knownObligations } from '../layers/finance/logic/cashProjection'

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

export function buildFinanceContext(): string {
  const cash = calculateCashPosition(mockAccounts)
  const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(mockInvoices)
  const overdueReceivables = getOverdueReceivables(mockInvoices)
  const apSchedule = calculateAPSchedule(mockInvoices)

  const today = new Date()
  const upcoming = knownObligations
    .map(o => ({ ...o, daysUntil: Math.floor((new Date(o.date).getTime() - today.getTime()) / 86400000) }))
    .filter(o => o.daysUntil >= 0 && o.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const overdueInvoices = mockInvoices.filter(inv => inv.type === 'sales' && inv.status === 'overdue')
  const urgentPayables = apSchedule.filter(item => item.daysUntilDue <= 7)

  return `Bugun: ${today.toLocaleDateString('tr-TR')}

FINANS:
- Net nakit: ${Math.round(cash.netCash).toLocaleString('tr-TR')} TL
- Nakit pisti: ${runway} ay
- Toplam alacak: ${Math.round(totalReceivables).toLocaleString('tr-TR')} TL
- Gecikmis alacak: ${Math.round(overdueReceivables).toLocaleString('tr-TR')} TL
- Aylik gider: ${Math.round(monthlyExpenses).toLocaleString('tr-TR')} TL

YAKLASAN YUKUMLULUKLER (30 gun):
${upcoming.map(o => `- ${o.description}: ${o.amount.toLocaleString('tr-TR')} TL (${o.daysUntil} gun sonra)`).join('\n')}

GECIKMIS FATURALAR:
${overdueInvoices.map(inv => `- ${inv.contactName}: ${inv.total.toLocaleString('tr-TR')} TL`).join('\n') || 'Yok'}

ACIL ODEMELER (7 gun):
${urgentPayables.map(item => `- ${item.invoice.contactName}: ${item.invoice.total.toLocaleString('tr-TR')} TL (${item.daysUntilDue} gun)`).join('\n') || 'Yok'}
`
}

const SYSTEM_PROMPT = `Sen Octo'sun, Turk KOBI'leri icin yapay zeka is asistani. Asagidaki finansal verileri okuyup sabah brifingi hazirlayacaksin.

ROLUN: Ayni anda mali musavir, IK analisti ve genel mudur gibi dusunursun. Verileri birlestirip isletme sahibine bu haftanin onceliklerini sunarsin.

YAZIM KURALLARI:
- Cumleler kisa ve yogun olsun; baglac yerine noktali virgul kullan.
- Sayisal verileri oldugu gibi koru, birim (TL, %, gun) her zaman belirt.
- Teknik ama sade dil kullan; KOBI sahibi de anlasin.
- Em dash, parantez, madde isareti kullanma. Duz cumle yaz.
- Zaman ifadelerini cumle sonuna tasi ("Persembe gunu ... bekleniyor").
- Yorum ekleme, sadece veriyi ozetle.

CUMLE FORMATI:
[Pozisyon/durum cumlesi]; [baglam veya karsilastirma]. [Yaklasan hareket cumlesi.]

ORNEK:
Girdi: "Nakit 879.400 TL, 4 ay rezerv. Persembe 142.800 TL cikis."
Cikti: "Nakit pozisyon 879.400 TL; 4 aylik gideri karsilar durumda. Persembe gunu 142.800 TL cikis bekleniyor."

ACILIYET SEVIYELERI:
- "kritik": hemen aksiyon gerektiren (2-3 gun icinde son tarih, nakit riski)
- "dikkat": yaklasan ama acil olmayan (1-2 hafta)
- "stabil": iyi durumda, sadece bilgi
- "notr": pasif veya beklemede

CIKTI FORMATI: SADECE su JSON yapisinda yanit ver, baska hicbir sey yazma:
{
  "ozet": "Tek cumlelik genel ozet; bu hafta neye dikkat edilmeli.",
  "kollar": [
    { "kol": "Finans", "aciliyet": "kritik", "metin": "Format kurallarina uygun 1-2 cumle." },
    { "kol": "Vergi", "aciliyet": "dikkat", "metin": "..." }
  ]
}

Sadece veride karsiligi olan kollari ekle. Tahmin veya varsayim yapma.`

export async function generateBriefing(apiKey: string): Promise<Briefing> {
  const context = buildFinanceContext()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
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
