import { mockAccounts, mockInvoices, mockTransactions } from '../layers/finance/mockData'
import { calculateCashPosition, calculateRunway, calculateMonthlyExpenses } from '../layers/finance/logic/cashPosition'
import { getTotalReceivables, getOverdueReceivables } from '../layers/finance/logic/arAging'
import { calculateAPSchedule } from '../layers/finance/logic/apSchedule'
import { knownObligations } from '../layers/finance/logic/cashProjection'

export function buildFinanceContext(): string {
  const cash = calculateCashPosition(mockAccounts)
  const monthlyExpenses = calculateMonthlyExpenses(mockTransactions)
  const runway = calculateRunway(cash.netCash, monthlyExpenses)
  const totalReceivables = getTotalReceivables(mockInvoices)
  const overdueReceivables = getOverdueReceivables(mockInvoices)
  const apSchedule = calculateAPSchedule(mockInvoices)

  const today = new Date()

  const upcomingObligations = knownObligations
    .map(o => ({
      ...o,
      daysUntil: Math.floor(
        (new Date(o.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    }))
    .filter(o => o.daysUntil >= 0 && o.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const overdueInvoices = mockInvoices.filter(
    inv => inv.type === 'sales' && inv.status === 'overdue'
  )

  const urgentPayables = apSchedule.filter(item => item.daysUntilDue <= 7)

  const totalUpcoming7Days = upcomingObligations
    .filter(o => o.daysUntil <= 7)
    .reduce((s, o) => s + o.amount, 0)

  const totalUpcoming30Days = upcomingObligations
    .reduce((s, o) => s + o.amount, 0)

  const cashAfter7Days = cash.netCash - totalUpcoming7Days
  const cashAfter30Days = cash.netCash - totalUpcoming30Days

  const revenueThisMonth = mockTransactions
    .filter(tx => tx.type === 'income')
    .reduce((s, tx) => s + tx.amount, 0)

  return `
TARİH: ${today.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

=== NAKİT POZİSYONU ===
Mevcut nakit: ${Math.round(cash.netCash).toLocaleString('tr-TR')} TL
Nakit ömrü: ${runway} ay
Bu ayki gelir: ${Math.round(revenueThisMonth).toLocaleString('tr-TR')} TL
Bu ayki gider: ${Math.round(monthlyExpenses).toLocaleString('tr-TR')} TL
Net kar tahmini: ${Math.round(revenueThisMonth - monthlyExpenses).toLocaleString('tr-TR')} TL

=== ALACAKLAR ===
Toplam acik alacak: ${Math.round(totalReceivables).toLocaleString('tr-TR')} TL
Gecikmiş alacak: ${Math.round(overdueReceivables).toLocaleString('tr-TR')} TL
${overdueInvoices.map(inv => `  - ${inv.contactName}: ${inv.total.toLocaleString('tr-TR')} TL (${Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))} gun gecikmiş)`).join('\n')}

=== ACİL ÖDEMELER (7 gun) ===
${urgentPayables.length > 0
  ? urgentPayables.map(item => `  - ${item.invoice.contactName}: ${item.invoice.total.toLocaleString('tr-TR')} TL (${item.daysUntilDue} gun kaldi)`).join('\n')
  : '  Yok'}
Toplam 7 gunluk yukumluluk: ${totalUpcoming7Days.toLocaleString('tr-TR')} TL
Odemeler sonrasi tahmini nakit: ${Math.round(cashAfter7Days).toLocaleString('tr-TR')} TL

=== YAKLAŞAN YUKUMLULUKLEr (30 gun) ===
${upcomingObligations.map(o => `  - ${o.description}: ${o.amount.toLocaleString('tr-TR')} TL (${o.daysUntil} gun sonra)`).join('\n')}
Toplam 30 gunluk yukumluluk: ${totalUpcoming30Days.toLocaleString('tr-TR')} TL
30 gun sonrasi tahmini nakit: ${Math.round(cashAfter30Days).toLocaleString('tr-TR')} TL

=== RİSK ANALİZİ ===
${cashAfter7Days < 100000 ? 'KRİTİK: 7 gun icinde nakit kritik seviyeye dusuyor' : cashAfter7Days < 200000 ? 'UYARI: 7 gun icinde nakit azaliyor' : 'Nakit pozisyonu saglikli'}
${overdueReceivables > 50000 ? `KRİTİK: ${Math.round(overdueReceivables).toLocaleString('tr-TR')} TL gecikmiş alacak tahsilat riski olusturuyor` : ''}
${runway < 3 ? 'KRİTİK: Nakit omru 3 ayin altinda' : runway < 6 ? 'UYARI: Nakit omru 6 ayin altinda' : ''}
`
}

export async function generateBriefing(apiKey: string): Promise<string> {
  const context = buildFinanceContext()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Sen Octo'sun — Turk KOBI sahipleri icin yapay zeka is danismanisin.
Her sabah isletme sahibine o gunun finansal durumunu anlatan kisa, net ve eyleme gecilebilir bir brifing hazirlarsin.

PERSONA:
- 15 yillik deneyimli bir mali musavir, IK uzmani ve is danismaninin birlesimi gibi konus
- Sayilari somut baglamа oturt — rakamlari tek basina verme, ne anlama geldigini soyle
- Turk is dunyasina ozgu terimleri kullan (SGK, KDV, e-fatura vb.)
- Ciddi ama eriselebilir bir ton — panik yaratma ama gercekleri saklama

CIKTI FORMATI:
- 4 ayri paragraf, aralarinda bos satir
- Her paragraf tek bir konuya odaklanir: once durum, sonra para, sonra risk, sonra eylem
- Paragraf baslarinda numara veya etiket YOK — sadece cumle
- Her paragraf bagimsiz okunabilmeli

KURALLAR:
- Toplam 4-5 cumle, asla daha fazla
- Her cumle yeni bir paragraf — bosluk birak
- Merhaba veya selamlama YOK
- Pasif cumle YOK — aktif, dogrudan konus
- Gereksiz kelime YOK — her kelime deger tasimali
- Rakamlari TL cinsinden yaz noktalı binlik ayraciyla ornek 879.400 TL
- Nakit omru 6 ayin altinda demek yerine mevcut nakitle kac ay faaliyete devam edebileceklerini soyle
- Turkce is dunyasinda kullanilmayan ceviri terimlerden kacin — dogal Turkce is dili kullan`,
        },
        {
          role: 'user',
          content: context,
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'Brifing olusturulamadi.'
}