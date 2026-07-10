import { ArrowRight, Eye, Sparkles } from 'lucide-react'
import { Label } from '../../shared/utils/ui'

type Props = { onDemo: () => void }

export default function LandingHero({ onDemo }: Props) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
      <div>
        <Label>Türkiye KOBİ’leri için düşünen işletme sistemi</Label>
        <h1 className="mt-6 font-display text-5xl leading-tight text-ink md:text-6xl">
          Her şeyi ayrı ayrı değil, <span className="italic text-crimson">birlikte görür.</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          Octo finans, vergi, bordro, stok ve operasyon verilerinizi tek görünümde birleştirir.
          Yaklaşan riskleri ve ödeme çakışmalarını erkenden görür; neye dikkat etmeniz gerektiğini kanıtıyla gösterir.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={onDemo} className="group inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            Nasıl çalıştığını görün
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a href="#pilot" className="inline-flex items-center justify-center rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-crimson hover:text-crimson">
            Kurucu pilotuna başvurun
          </a>
        </div>
        <p className="mt-4 text-sm text-ink-mute">Büyüyün. İdari yükünüz büyümesin.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-crimson/40" />
          <span className="h-3 w-3 rounded-full bg-warn/40" />
          <span className="h-3 w-3 rounded-full bg-positive/40" />
          <span className="ml-2 font-mono text-xs text-ink-mute">app.octo.com.tr</span>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Sparkles size={14} className="text-crimson" /><span className="label text-ink-mute">Önümüzdeki 30 gün</span></div>
            <span className="rounded-full bg-crimson/10 px-3 py-1 text-xs font-medium text-crimson">Önemli</span>
          </div>
          <div className="mt-5">
            <p className="text-sm text-ink-mute">Olası nakit açığı</p>
            <p className="mt-1 font-display text-4xl text-ink">145.000 TL</p>
            <p className="mt-1 text-sm text-ink-soft">Beklenen tarih: 27 Ağustos</p>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            Maaş, SGK, KDV ve kesinleşmiş tedarikçi ödemeleri aynı dönemde yoğunlaşıyor. Mevcut tahsilatlara göre olası bir açık oluşuyor.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[['Maaş','210.000 TL'],['SGK','86.000 TL'],['KDV','228.300 TL'],['Tedarikçi','95.700 TL']].map(([label, amount]) => (
              <div key={label} className="rounded-lg border border-line bg-paper/40 p-3"><p className="text-xs text-ink-mute">{label}</p><p className="mt-1 text-sm font-medium text-ink">{amount}</p></div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-warn/30 bg-warn/5 p-3">
            <p className="text-xs font-medium text-warn">Eksik bilgi</p>
            <p className="mt-1 text-sm text-ink-soft">İki müşteri tahsilat tarihi henüz doğrulanmadı.</p>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
            <Eye size={13} className="text-ink-mute" />
            <span className="text-xs text-ink-mute">Kayıtları ve hesabı görüntüleyin</span>
          </div>
        </div>
      </div>
    </section>
  )
}
