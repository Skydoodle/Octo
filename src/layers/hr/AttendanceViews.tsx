import { useState } from 'react'
import { Card, Label } from '../../shared/utils/ui'
import EmptyState from '../../shared/utils/EmptyState'
import {
  useIKStore, setIzinDurumu, deleteIzin, kullanilanYillikIzin,
} from './hrStore'
import NewIzinForm from './NewIzinForm'
import {
  gunDurumuLabels, izinTuruLabels, izinDurumuLabels, izinBakiyesi,
  type GunDurumu,
} from './attendanceTypes'

const durumRenk: Record<GunDurumu, string> = {
  tam: 'bg-positive/15 text-positive',
  yarim: 'bg-positive/10 text-positive',
  devamsiz: 'bg-crimson/15 text-crimson',
  yillik_izin: 'bg-warn/15 text-warn',
  hastalik: 'bg-crimson/10 text-crimson',
  ucretsiz_izin: 'bg-ink-mute/15 text-ink-mute',
  resmi_tatil: 'bg-ink-mute/10 text-ink-mute',
  hafta_tatili: 'bg-surface-2 text-ink-mute',
}

const kisaDurum: Record<GunDurumu, string> = {
  tam: 'T', yarim: 'Y', devamsiz: 'D', yillik_izin: 'İ',
  hastalik: 'R', ucretsiz_izin: 'Ü', resmi_tatil: 'RT', hafta_tatili: '·',
}

// ── Puantaj tab ──────────────────────────────────────────────────────────
export function PuantajView({ donem }: { donem: string }) {
  const { personeller, puantajlar } = useIKStore()
  const aktif = personeller.filter(p => p.aktif)

  if (aktif.length === 0) {
    return <Card className="p-6"><EmptyState title="Puantaj için personel gerekli" hint="Personel ekleyince aylık puantaj burada görünür." /></Card>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Aylık Puantaj — {donem}</Label>
        <div className="flex gap-3 text-xs text-ink-mute">
          <span><span className="font-mono text-positive">T</span> Tam</span>
          <span><span className="font-mono text-warn">İ</span> İzin</span>
          <span><span className="font-mono text-crimson">D</span> Devamsız</span>
          <span><span className="font-mono text-crimson">R</span> Rapor</span>
          <span><span className="font-mono text-ink-mute">Ü</span> Ücretsiz</span>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Personel</span></th>
                <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Çalışan</span></th>
                <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Devamsız</span></th>
                <th className="px-3 py-3 text-right"><span className="label text-ink-mute">İzin</span></th>
                <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Rapor</span></th>
                <th className="px-3 py-3 text-right"><span className="label text-ink-mute">F. Mesai</span></th>
              </tr>
            </thead>
            <tbody>
              {aktif.map((p, i) => {
                const pz = puantajlar.find(x => x.personelId === p.id && x.donem === donem)
                return (
                  <tr key={p.id} className={i > 0 ? 'border-t border-line' : ''}>
                    <td className="px-4 py-2.5 text-ink">{p.ad} {p.soyad}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-positive">{pz ? pz.calisanGun : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-crimson">{pz?.devamsizGun || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-warn">{pz?.yillikIzinGun || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-soft">{pz?.hastalikGun || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-soft">{pz?.fazlaMesaiSaat ? pz.fazlaMesaiSaat + ' sa' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-ink-mute">
        Devamsız ve ücretsiz izin günleri bordroda brütü düşürür; fazla mesai %50 zamlı eklenir. Puantaj doğrudan maaş ve SGK matrahını etkiler.
      </p>
    </div>
  )
}

// ── İzin tab ─────────────────────────────────────────────────────────────
export function IzinView() {
  const { personeller, izinler } = useIKStore()
  const [showForm, setShowForm] = useState(false)
  const aktif = personeller.filter(p => p.aktif)

  const personelAd = (id: string) => {
    const p = personeller.find(x => x.id === id)
    return p ? `${p.ad} ${p.soyad}` : id
  }

  return (
    <div className="space-y-5">
      {/* Leave balances */}
      <div>
        <Label>İzin Bakiyeleri</Label>
        {aktif.length === 0 ? (
          <Card className="mt-3 p-6"><EmptyState compact title="Personel yok" hint="Personel ekleyince izin hakları hesaplanır." /></Card>
        ) : (
          <Card className="mt-3 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2">
                  <tr>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Personel</span></th>
                    <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Yıllık Hak</span></th>
                    <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Kullanılan</span></th>
                    <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Kalan</span></th>
                  </tr>
                </thead>
                <tbody>
                  {aktif.map((p, i) => {
                    const bal = izinBakiyesi(p.iseGirisTarihi, kullanilanYillikIzin(p.id))
                    return (
                      <tr key={p.id} className={i > 0 ? 'border-t border-line' : ''}>
                        <td className="px-4 py-2.5 text-ink">{p.ad} {p.soyad}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-ink">{bal.hak} gün</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-soft">{bal.kullanilan} gün</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-positive">{bal.kalan} gün</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Leave requests */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label>İzin Talepleri ({izinler.length})</Label>
          <button onClick={() => setShowForm(true)} disabled={aktif.length === 0}
            className="rounded bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
            + Yeni Talep
          </button>
        </div>

        {izinler.length === 0 ? (
          <Card className="p-6"><EmptyState title="İzin talebi yok" hint="Yeni talep oluşturunca onay akışı burada görünür." /></Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2">
                  <tr>
                    <th className="px-4 py-3 text-left"><span className="label text-ink-mute">Personel</span></th>
                    <th className="px-3 py-3 text-left"><span className="label text-ink-mute">Tür</span></th>
                    <th className="px-3 py-3 text-left"><span className="label text-ink-mute">Tarih</span></th>
                    <th className="px-3 py-3 text-right"><span className="label text-ink-mute">Gün</span></th>
                    <th className="px-3 py-3 text-left"><span className="label text-ink-mute">Durum</span></th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {izinler.map((iz, i) => (
                    <tr key={iz.id} className={i > 0 ? 'border-t border-line' : ''}>
                      <td className="px-4 py-2.5 text-ink">{personelAd(iz.personelId)}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{izinTuruLabels[iz.tur]}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink-mute">{iz.baslangic} → {iz.bitis}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-ink">{iz.gunSayisi}</td>
                      <td className="px-3 py-2.5">
                        <span className={'rounded px-2 py-0.5 text-xs ' + (
                          iz.durum === 'onaylandi' ? 'bg-positive/15 text-positive' :
                          iz.durum === 'reddedildi' ? 'bg-crimson/15 text-crimson' : 'bg-warn/15 text-warn'
                        )}>{izinDurumuLabels[iz.durum]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {iz.durum === 'beklemede' ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setIzinDurumu(iz.id, 'onaylandi')} className="text-xs text-positive hover:underline">onayla</button>
                            <button onClick={() => setIzinDurumu(iz.id, 'reddedildi')} className="text-xs text-crimson hover:underline">reddet</button>
                          </div>
                        ) : (
                          <button onClick={() => deleteIzin(iz.id)} className="text-xs text-ink-mute hover:text-crimson">sil</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showForm && <NewIzinForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
