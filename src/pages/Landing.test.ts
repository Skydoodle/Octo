import { describe, expect, it } from 'vitest'
import landingSource from './Landing.tsx?raw'

describe('landing page credibility copy', () => {
  it('uses the corrected positioning and product-entry labels', () => {
    expect(landingSource).toContain('Türk KOBİ’leri için bütünleşik arka ofis sistemi')
    expect(landingSource).toContain('Sekiz kol, tek akıl')
    expect(landingSource).toContain('Türkiye için, Türkiye’den.')
    expect(landingSource).toContain('Octo’ya Gir')
  })

  it('marks active and roadmap layers accurately', () => {
    for (const layer of ['Finans', 'Vergi', 'İnsan Kaynakları']) {
      expect(landingSource).toMatch(new RegExp(`name: '${layer}'[^\\n]+status: 'Aktif'`))
    }
    for (const layer of ['Hukuk', 'Operasyon', 'Satış ve Teklifler', 'Denetim ve Uyum', 'Dış Denetim Hazırlığı']) {
      expect(landingSource).toMatch(new RegExp(`name: '${layer}'[^\\n]+status: 'Yol haritasında'`))
    }
  })

  it('removes unsupported scarcity, location, and ERP claims', () => {
    expect(landingSource).not.toContain('12 / 50 dolu')
    expect(landingSource).not.toContain('Türkiye sınırları içinde')
    expect(landingSource).not.toContain('ERP’nizi değiştirmez')
    expect(landingSource).not.toContain('ERPnizi değiştirmez')
  })
})
