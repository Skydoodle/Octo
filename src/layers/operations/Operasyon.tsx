import { useState } from 'react'
import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import { useOpStore, stokMiktari, stokMaliyeti, kritikStoklar, toplamStokDegeri, tumStokTahminleri, urunStokTahmini } from './opStore'
import { urunTipiLabels, birimLabels } from './types'
import { aciliyetLabels, aciliyetRenk, guvenLabels, TAHMIN_PENCERE_GUN } from './forecast'
import NewUrunForm from './NewUrunForm'
import { SiparisView } from './SiparisViews'
import { UretimView } from './UretimViews'
import { SevkiyatView, TedarikciView } from './OpViews'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

type Tab = 'stok' | 'siparis' | 'uretim' | 'sevkiyat' | 'tedarikci'

export default function Operasyon() {
  const [tab, setTab] = useState<Tab>('stok')

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgb(var(--crimson))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Katman — 05
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: 'rgb(var(--ink))', letterSpacing: '-0.02em' }}>
          Operasyon
        </h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgb(var(--line))', marginBottom: '24px' }}>
        {([['stok', 'Stok'], ['siparis', 'Siparişler'], ['uretim', 'Üretim'], ['sevkiyat', 'Sevkiyat'], ['tedarikci', 'Tedarikçiler']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: tab === id ? '2px solid rgb(var(--crimson))' : '2px solid transparent',
              color: tab === id ? 'rgb(var(--ink))' : 'rgb(var(--ink-mute))',
              fontSize: '14px', fontWeight: tab === id ? 500 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'stok' && <StokView />}
      {tab === 'siparis' && <SiparisView />}
      {tab === 'uretim' && <UretimView />}
      {tab === 'sevkiyat' && <SevkiyatView />}
      {tab === 'tedarikci' && <TedarikciView />}
    </div>
  )
}

function StokView() {
  const { urunler } = useOpStore()
  const [showForm, setShowForm] = useState(false)
  const kritikler = kritikStoklar()
  const stokDeger = toplamStokDegeri()

  return (
    <div className="space-y-5">
      {/* Özet + kritik uyarı (cross-arm) */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="label text-ink-mute">Toplam Stok Değeri</div>
          <div className="mt-1 font-mono text-lg text-ink">{fmt(stokDeger)}</div>
        </Card>
        <Card className="p-4">
          <div className="label text-ink-mute">Ürün Çeşidi</div>
          <div className="mt-1 font-mono text-lg text-ink">{urunler.filter(u => u.aktif).length}</div>
        </Card>
        <Card className="p-4">
          <div className="label text-ink-mute">Kritik Stok</div>
          <div className={'mt-1 font-mono text-lg ' + (kritikler.length > 0 ? 'text-crimson' : 'text-positive')}>{kritikler.length}</div>
        </Card>
      </div>

      {/* Kritik stok uyarıları — cross-arm sinyali */}
      {kritikler.length > 0 && (
        <Card className="border-crimson/30 p-0">
          <div className="border-b border-line bg-crimson/5 px-5 py-3">
            <span className="text-sm font-medium text-crimson">⚠ Kritik Stok Uyarıları</span>
            <span className="ml-2 text-xs text-ink-mute">açık satış siparişi olanlar öncelikli risk</span>
          </div>
          <div className="divide-y divide-line">
            {kritikler.map(k => (
              <div key={k.urun.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-ink">{k.urun.ad}</span>
                  <span className="ml-2 font-mono text-xs text-ink-mute">{k.urun.kod}</span>
                </div>
                <div className="flex items-center gap-5 text-xs">
                  <span className="text-ink-mute">mevcut <span className="font-mono text-crimson">{k.mevcut}</span> / kritik <span className="font-mono text-ink">{k.kritikSeviye}</span></span>
                  {k.acikSatisMiktar > 0 && <span className="rounded bg-crimson/15 px-2 py-0.5 text-crimson">açık satış: {k.acikSatisMiktar} {birimLabels[k.urun.birim]}</span>}
                  <span className="text-ink-mute">tedarik {k.tedarikSuresiGun}g</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Yeniden Sipariş Tahmini paneli — Katman 1 (tüketim oranına dayalı) */}
      <ReorderPaneli />

      {/* Ürün listesi */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label>Ürünler / Stok Kartları</Label>
          <button onClick={() => setShowForm(true)} className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90">+ Yeni Ürün</button>
        </div>

        {urunler.length === 0 ? (
          <Card className="p-6"><EmptyState title="Ürün yok" hint="Stok kartı ekleyince stok takibi, üretim reçeteleri ve siparişler bağlanır." /></Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2">
                  <tr>
                    <th className="px-5 py-3 text-left"><span className="label text-ink-mute">Ürün</span></th>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Tip</span></th>
                    <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Stok</span></th>
                    <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Maliyet</span></th>
                    <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Satış Fiyatı</span></th>
                    <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Değer</span></th>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Tahmini Tükenme</span></th>
                  </tr>
                </thead>
                <tbody>
                  {urunler.map((u, i) => {
                    const adet = stokMiktari(u.id)
                    const mlt = stokMaliyeti(u.id)
                    const kritik = u.tip !== 'hizmet' && adet <= u.kritikSeviye
                    return (
                      <tr key={u.id} className={i > 0 ? 'border-t border-line' : ''}>
                        <td className="px-5 py-3">
                          <div className="font-medium text-ink">{u.ad}</div>
                          <div className="font-mono text-xs text-ink-mute">{u.kod}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{urunTipiLabels[u.tip]}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={'font-mono text-xs ' + (kritik ? 'text-crimson' : 'text-ink')}>{u.tip === 'hizmet' ? '—' : `${adet} ${birimLabels[u.birim]}`}</span>
                          {kritik && <span className="ml-1 text-crimson">⚠</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-mute">{mlt > 0 ? fmt(mlt) : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-ink">{u.satisFiyati > 0 ? fmt(u.satisFiyati) : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-soft">{u.tip === 'hizmet' ? '—' : fmt(adet * mlt)}</td>
                        <td className="px-4 py-3"><TahminHucresi urunId={u.id} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showForm && <NewUrunForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

// Satır içi tahmin hücresi: tahmini tükenme günü + aciliyet rozeti.
function TahminHucresi({ urunId }: { urunId: string }) {
  const t = urunStokTahmini(urunId)
  if (!t || t.aciliyet === 'tukenmiyor') {
    return <span className="text-xs text-ink-mute">—</span>
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-ink">{t.kalanGun !== null ? `~${Math.round(t.kalanGun)}g` : '—'}</span>
      <span className={'text-xs ' + aciliyetRenk[t.aciliyet]}>{aciliyetLabels[t.aciliyet]}</span>
      {t.guven === 'dusuk' && <span className="rounded bg-ink-mute/15 px-1.5 py-0.5 text-[10px] text-ink-mute" title="Az veriye dayanıyor">?</span>}
    </div>
  )
}

// Yeniden Sipariş paneli: sipariş verilmesi gereken ürünleri öne çıkarır.
function ReorderPaneli() {
  const { urunler } = useOpStore()  // re-render bağımlılığı
  void urunler
  const tahminler = tumStokTahminleri()
    .filter(t => t.aciliyet === 'gecikti' || t.aciliyet === 'simdi' || t.aciliyet === 'yakinda')
    .sort((a, b) => (a.kalanGun ?? 1e9) - (b.kalanGun ?? 1e9))

  if (tahminler.length === 0) return null

  const urunAd = (id: string) => urunler.find(u => u.id === id)?.ad ?? id
  const urunBirim = (id: string) => {
    const u = urunler.find(x => x.id === id)
    return u ? birimLabels[u.birim] : ''
  }

  return (
    <Card className="border-warn/30 p-0">
      <div className="border-b border-line bg-warn/5 px-5 py-3">
        <span className="text-sm font-medium text-ink">Yeniden Sipariş Önerileri</span>
        <span className="ml-2 text-xs text-ink-mute">son {TAHMIN_PENCERE_GUN} günlük tüketim hızına göre · tedarik süresi hesaba katıldı</span>
      </div>
      <div className="divide-y divide-line">
        {tahminler.map(t => (
          <div key={t.urunId} className="flex items-center justify-between px-5 py-3">
            <div>
              <span className="text-sm font-medium text-ink">{urunAd(t.urunId)}</span>
              <span className="ml-2 text-xs text-ink-mute">
                {t.gunlukTuketim.toFixed(1)} {urunBirim(t.urunId)}/gün · {t.kalanGun !== null ? `~${Math.round(t.kalanGun)} gün kaldı` : ''}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-ink-mute">öneri: <span className="font-mono text-ink">{t.onerilticMiktar} {urunBirim(t.urunId)}</span></span>
              {t.yenidenSiparisTarihi && <span className="text-ink-mute">sipariş: <span className="font-mono text-ink">{t.yenidenSiparisTarihi}</span></span>}
              <span className={'font-medium ' + aciliyetRenk[t.aciliyet]}>{aciliyetLabels[t.aciliyet]}</span>
              <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-ink-mute">{guvenLabels[t.guven]}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-5 py-2">
        <p className="text-[11px] text-ink-mute">Lineer tahmin: sabit tüketim varsayar, mevsimsel/ani değişimi yakalamaz. "Düşük güven" az veriye dayanır.</p>
      </div>
    </Card>
  )
}
