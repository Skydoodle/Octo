import { useState } from 'react'
import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import { useIKStore, deletePersonel, bordroDonemHesapla, kullanilanYillikIzin } from './hrStore'
import NewPersonelForm from './NewPersonelForm'
import PersonelImport from './PersonelImport'
import { PuantajView, IzinView } from './AttendanceViews'
import { brutToNet } from './bordroEngine'
import { personelEksikAlanlar, personelAlanLabels, sgkDurumuLabels } from './types'
import { izinBakiyesi } from './attendanceTypes'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

type Tab = 'personel' | 'bordro' | 'puantaj' | 'izin'

export default function IK() {
  const { personeller } = useIKStore()
  const [tab, setTab] = useState<Tab>('personel')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const now = new Date()
  const donem = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const selectedPersonel = personeller.find(p => p.id === selected) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgb(var(--crimson))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Katman — 04
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: 'rgb(var(--ink))', letterSpacing: '-0.02em' }}>
          İnsan Kaynakları
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgb(var(--line))', marginBottom: '24px' }}>
        {([['personel', 'Personel'], ['bordro', 'Bordro'], ['puantaj', 'Puantaj'], ['izin', 'İzinler']] as const).map(([id, label]) => (
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

      {tab === 'personel' && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <Label>Personel ({personeller.filter(p => p.aktif).length} aktif)</Label>
            <div className="flex gap-2">
              <button onClick={() => setShowImport(true)} className="rounded border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-crimson hover:text-crimson">
                Excel'den İçe Aktar
              </button>
              <button onClick={() => setShowForm(true)} className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                + Yeni Personel
              </button>
            </div>
          </div>

          {personeller.length === 0 ? (
            <Card className="p-6">
              <EmptyState title="Personel yok" hint="Personel ekleyince bordro otomatik hesaplanır ve SGK/maaş yükümlülükleri diğer katmanlara işlenir." />
            </Card>
          ) : (
            <div className="grid grid-cols-[1.5fr_1fr] gap-4">
              <Card className="p-0">
                <div className="max-h-[560px] overflow-y-auto">
                  {personeller.map((p, i) => {
                    const b = brutToNet(p.brutMaas, p.sgkIndirimli)
                    const eksik = personelEksikAlanlar(p)
                    return (
                      <div key={p.id} onClick={() => setSelected(p.id)}
                        className={'cursor-pointer px-5 py-3.5 ' + (i > 0 ? 'border-t border-line ' : '') + (selected === p.id ? 'bg-surface-2' : 'hover:bg-surface-2/50')}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink">{p.ad} {p.soyad}</span>
                            {!p.aktif && <span className="rounded bg-ink-mute/15 px-1.5 py-0.5 text-[10px] text-ink-mute">pasif</span>}
                            {eksik.length > 0 && <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">eksik bilgi</span>}
                          </div>
                          <span className="font-mono text-sm text-positive">{fmt(b.net)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-xs text-ink-mute">{p.pozisyon || p.departman}</span>
                          <span className="font-mono text-xs text-ink-mute">brüt {fmt(p.brutMaas)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {selectedPersonel ? (
                <PersonelDetail personel={selectedPersonel} onDeleted={() => setSelected(null)} />
              ) : (
                <Card className="p-6"><EmptyState compact title="Personel seç" hint="Detayları görmek için soldan bir personel seç." /></Card>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'bordro' && <BordroView donem={donem} />}
      {tab === 'puantaj' && <PuantajView donem={donem} />}
      {tab === 'izin' && <IzinView />}

      {showForm && <NewPersonelForm onClose={() => setShowForm(false)} />}
      {showImport && <PersonelImport onClose={() => setShowImport(false)} />}
    </div>
  )
}

function BordroView({ donem }: { donem: string }) {
  const { personeller } = useIKStore()
  if (personeller.filter(p => p.aktif).length === 0) {
    return <Card className="p-6"><EmptyState title="Bordro için personel gerekli" hint="Personel ekleyince aylık bordro burada hesaplanır." /></Card>
  }

  const d = bordroDonemHesapla(donem)

  return (
    <div className="space-y-5">
      {/* Cross-arm outputs — the whole point of İK not being a silo */}
      <div>
        <Label>Dönem Özeti — {donem}</Label>
        <div className="mt-3 grid grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="label text-ink-mute">Toplam Net Maaş</div>
            <div className="mt-1 font-mono text-lg text-positive">{fmt(d.toplamNet)}</div>
            <div className="mt-1 text-xs text-ink-mute">→ Finans (nakit çıkışı)</div>
          </Card>
          <Card className="p-4">
            <div className="label text-ink-mute">SGK Primi</div>
            <div className="mt-1 font-mono text-lg text-ink">{fmt(d.sgkPrimToplam)}</div>
            <div className="mt-1 text-xs text-ink-mute">→ Vergi (SGK beyanname)</div>
          </Card>
          <Card className="p-4">
            <div className="label text-ink-mute">Gelir V. + Damga</div>
            <div className="mt-1 font-mono text-lg text-ink">{fmt(d.muhtasarToplam)}</div>
            <div className="mt-1 text-xs text-ink-mute">→ Vergi (Muhtasar)</div>
          </Card>
          <Card className="p-4">
            <div className="label text-ink-mute">İşveren Maliyeti</div>
            <div className="mt-1 font-mono text-lg text-crimson">{fmt(d.toplamIsverenMaliyeti)}</div>
            <div className="mt-1 text-xs text-ink-mute">brüt + işveren payı</div>
          </Card>
        </div>
      </div>

      {/* Per-person payroll slips */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Personel</span></th>
                <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Brüt</span></th>
                <th className="px-4 py-3 text-right"><span className="label text-ink-mute">SGK İşçi</span></th>
                <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Gelir V.</span></th>
                <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Damga</span></th>
                <th className="px-4 py-3 text-right"><span className="label text-ink-mute">Net</span></th>
              </tr>
            </thead>
            <tbody>
              {d.bordrolar.map((b, i) => {
                const p = personeller.find(x => x.id === b.personelId)
                return (
                  <tr key={b.personelId} className={i > 0 ? 'border-t border-line' : ''}>
                    <td className="px-4 py-2.5 text-ink">{p ? `${p.ad} ${p.soyad}` : b.personelId}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{fmt(b.brutMaas)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-soft">{fmt(b.sgkIsci + b.issizlikIsci)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-soft">{fmt(b.gelirVergisi)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-soft">{fmt(b.damgaVergisi)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-positive">{fmt(b.netMaas)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-ink-mute">
        Bordro 2026 parametreleriyle hesaplanır (asgari ücret 33.030 TL, SGK işçi %14, işsizlik %1, gelir vergisi dilimleri, damga binde 7,59, asgari ücret istisnası). Kümülatif matrah sabit maaş varsayımıyla modellenir.
      </p>
    </div>
  )
}

function PersonelDetail({ personel, onDeleted }: { personel: import('./types').Personel; onDeleted: () => void }) {
  const b = brutToNet(personel.brutMaas, personel.sgkIndirimli)
  const eksik = personelEksikAlanlar(personel)
  const bal = izinBakiyesi(personel.iseGirisTarihi, kullanilanYillikIzin(personel.id))
  const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')

  const row = (label: string, value?: string, warn = false) => (
    <div className="flex justify-between border-b border-line py-2.5">
      <span className="text-xs text-ink-mute">{label}</span>
      <span className={'text-sm ' + (warn ? 'text-warn' : 'text-ink')}>{value || (warn ? 'eksik' : '—')}</span>
    </div>
  )

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-base font-medium text-ink">{personel.ad} {personel.soyad}</div>
          <div className="text-xs text-ink-mute">{personel.pozisyon} · {personel.departman}</div>
        </div>
        <button onClick={() => { deletePersonel(personel.id); onDeleted() }} className="text-xs text-ink-mute hover:text-crimson">sil</button>
      </div>

      {/* Maaş özeti */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded border border-line p-2.5">
          <div className="label text-ink-mute">Net</div>
          <div className="mt-1 font-mono text-sm text-positive">{fmt(b.net)}</div>
        </div>
        <div className="rounded border border-line p-2.5">
          <div className="label text-ink-mute">Brüt</div>
          <div className="mt-1 font-mono text-sm text-ink">{fmt(personel.brutMaas)}</div>
        </div>
        <div className="rounded border border-line p-2.5">
          <div className="label text-ink-mute">Maliyet</div>
          <div className="mt-1 font-mono text-sm text-crimson">{fmt(b.isverenMaliyeti)}</div>
        </div>
      </div>

      {eksik.length > 0 && (
        <div className="mb-4 rounded border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
          Eksik bilgi: {eksik.map(f => f === 'telefon' ? 'Telefon' : 'IBAN').join(', ')}. Maaş ödemesi ve ulaşım için tamamlanmalı.
        </div>
      )}

      {/* İzin bakiyesi */}
      <div className="mb-4 flex items-center justify-between rounded border border-line bg-surface-2 px-3 py-2 text-xs">
        <span className="text-ink-mute">Yıllık izin</span>
        <span className="text-ink">{bal.kalan} / {bal.hak} gün kalan</span>
      </div>

      <div>
        {row('TC Kimlik', personel.tcKimlik)}
        {row('Telefon', personel.telefon, !personel.telefon)}
        {row('IBAN', personel.iban, !personel.iban)}
        {row('E-posta', personel.eposta)}
        {row('Adres', personel.adres)}
        {row('İşe Giriş', personel.iseGirisTarihi)}
        {row('Doğum Tarihi', personel.dogumTarihi)}
        {row('SGK Durumu', sgkDurumuLabels[personel.sgkDurumu])}
        {row('Acil Durum', personel.acilKisi ? `${personel.acilKisi}${personel.acilTelefon ? ' · ' + personel.acilTelefon : ''}` : '')}
      </div>
    </Card>
  )
}
