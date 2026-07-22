import { describe, expect, it } from 'vitest'
import appSource from '../../../App.tsx?raw'
import layoutSource from '../ui/SalesLayout.tsx?raw'
import pageSource from './SalesWorkbenchPage.tsx?raw'

describe('Sales Workbench V1 interface', () => {
  it('uses /dashboard/satis as the real workbench instead of redirecting', () => { expect(appSource).toContain('<Route index element={<SalesWorkbenchPage />} />'); expect(appSource).not.toContain('Navigate to="firmalar"') })
  it('preserves all deep sales routes', () => { for (const route of ['firmalar','kisiler','potansiyel-musteriler','firsatlar','pipeline','aktiviteler','teklifler','satis-siparisleri','musteri-sagligi']) expect(appSource).toContain(`path="${route}`) })
  it('renders exact grouped navigation concepts in the intended order', () => { const labels=['Genel Bakış','Müşteriler','Firmalar','Kişiler','Müşteri Sağlığı','Satış Süreci','Potansiyel Müşteriler','Fırsatlar','Pipeline','Aktiviteler','Ticari İşlemler','Teklifler','Satış Siparişleri'];labels.reduce((position,label)=>{const next=layoutSource.indexOf(`'${label}'`,position+1);expect(next).toBeGreaterThan(position);return next},-1) })
  it('keeps the overview active match exact and navigation keyboard accessible', () => { expect(layoutSource).toContain("end={to === '/dashboard/satis'}"); expect(layoutSource).toContain('<NavLink') })
  it('loads only company-scoped repository functions', () => { for (const fn of ['listBusinessParties','listSalesLeads','listSalesPipelines','listSalesPipelineStages','listSalesOpportunities','listSalesActivities','listSalesQuotes','listSalesOrders','listCurrentCustomerHealth','listPreparedWork']) expect(pageSource).toContain(fn); expect(pageSource).not.toMatch(/supabase|\.from\(/) })
  it('provides loading, full error, partial error, empty and retry states', () => { expect(pageSource).toContain('Satış çalışma alanı hazırlanıyor…'); expect(pageSource).toContain('Satış çalışma alanı yüklenemedi.'); expect(pageSource).toContain('Bazı satış kaynakları yüklenemedi.'); expect(pageSource).toContain('Yeniden dene'); expect(pageSource).toContain('Bugün gecikmiş veya bloke olmuş satış takibi yok.') })
  it('shows real Assisted Execution cases with honest empty state', () => { expect(pageSource).toContain('buildPreparedWorkItems');expect(pageSource).toContain('Henüz hazırlanmış iş bulunmuyor.');expect(pageSource).toContain('bloklayan bilgi') })
  it('shows prepared-work and quotation approvals with compact non-monetary flow counts', () => { expect(pageSource).toContain('pendingQuoteApprovals'); expect(pageSource).toContain('Onay bekleyen teklif veya hazırlanmış iş yok.'); expect(pageSource).toContain('para birimleri ve parasal değerler birleştirilmez') })
  it('keeps accountants read-only and hides preparation action', () => { expect(pageSource).toContain('Salt okunur görünüm');expect(pageSource).toMatch(/canWrite\s*&&/); expect(pageSource).not.toMatch(/createSales|updateSales|transitionSales|refreshCompany/) })
  it('does not add scoring, forecasting, analytics or legacy-store access', () => { expect(pageSource + layoutSource).not.toMatch(/Opportunity Scoring|Fırsat Skoru|Forecasting|Tahminleme|Analytics|Analitik|cariStore|localStorage/) })
})
