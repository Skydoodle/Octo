import { useState } from 'react'
import { Card, Label } from '../../../shared/utils/ui'
import EmptyState from '../../../shared/utils/EmptyState'
import { useLedgerStore, buildMizan, mizanTotals, buildDefter, buildGelirTablosu, tdhpAccountCount } from '../muhasebe/ledgerStore'
import { accountName } from '../muhasebe/tdhp'
import type { MizanRow } from '../muhasebe/types'

const fmt = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')
const fmt2 = (n: number) => n === 0 ? '—' : '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const views = [
  { id: 'mizan', label: 'Mizan' },
  { id: 'yevmiye', label: 'Yevmiye' },
  { id: 'defter', label: 'Defter-i Kebir' },
  { id: 'gelir', label: 'Gelir Tablosu' },
]

const tipRenk: Record<string, string> = {
  aktif: 'rgb(var(--ink))',
  pasif: 'rgb(var(--warn))',
  ozkaynak: 'rgb(var(--crimson))',
  gelir: 'rgb(var(--positive))',
  gider: 'rgb(var(--crimson))',
  maliyet: 'rgb(var(--warn))',
  nazim: 'rgb(var(--ink-mute))',
}

export default function Muhasebe() {
  const { entries } = useLedgerStore()
  const [view, setView] = useState('mizan')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const hasData = entries.length > 0
  const mizan = buildMizan()
  const totals = mizanTotals()

  return (
    <div>
      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: view === v.id ? 600 : 400,
              background: view === v.id ? 'rgb(var(--crimson))' : 'transparent',
              color: view === v.id ? '#fff' : 'rgb(var(--ink-mute))',
              transition: 'all 0.15s',
            }}
          >
            {v.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '11px', color: 'rgb(var(--ink-mute))', alignSelf: 'center' }}>
          {tdhpAccountCount} hesap · TDHP
        </div>
      </div>

      {!hasData ? (
        <Card className="p-6">
          <EmptyState title="Muhasebe kaydı yok" hint="Fatura kesildiğinde veya tahsilat yapıldığında yevmiye fişleri otomatik oluşur." />
        </Card>
      ) : view === 'mizan' ? (
        <Card className="p-0">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Mizan (Geçici)</Label>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: totals.dengeli ? 'rgb(var(--positive))' : 'rgb(var(--crimson))' }}>
              {totals.dengeli ? '◆ Denge sağlandı' : '✗ Denge bozuk'}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px' }}>Hesap</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Borç</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Alacak</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Borç Bakiye</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px' }}>Alacak Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {mizan.map((r: MizanRow) => (
                  <tr
                    key={r.hesapKodu}
                    onClick={() => { setSelectedAccount(r.hesapKodu); setView('defter') }}
                    style={{ borderTop: '1px solid rgb(var(--line))', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px 20px' }}>
                      <span style={{ fontFamily: 'monospace', color: tipRenk[r.tip], fontWeight: 500 }}>{r.hesapKodu}</span>
                      <span style={{ marginLeft: '10px', color: 'rgb(var(--ink))' }}>{r.hesapAdi}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', color: 'rgb(var(--ink-soft))' }}>{fmt2(r.borcToplam)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', color: 'rgb(var(--ink-soft))' }}>{fmt2(r.alacakToplam)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', color: 'rgb(var(--ink))', fontWeight: 500 }}>{fmt2(r.borcBakiye)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 20px', fontFamily: 'monospace', color: 'rgb(var(--ink))', fontWeight: 500 }}>{fmt2(r.alacakBakiye)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgb(var(--line))', background: 'rgb(var(--paper))' }}>
                  <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase', color: 'rgb(var(--ink-mute))' }}>Toplam</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'rgb(var(--ink))' }}>{fmt2(totals.borc)}</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'rgb(var(--ink))' }}>{fmt2(totals.alacak)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : view === 'yevmiye' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map(e => {
            const eb = e.satirlar.reduce((s, l) => s + l.borc, 0)
            return (
              <Card key={e.id} className="p-0">
                <div style={{ padding: '12px 20px', borderBottom: '1px solid rgb(var(--line))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgb(var(--crimson))' }}>#{e.fisNo}</span>
                    <span style={{ fontSize: '13px', color: 'rgb(var(--ink))' }}>{e.aciklama}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgb(var(--ink-mute))' }}>{e.tarih}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    {e.satirlar.map((l, i) => (
                      <tr key={i} style={{ borderTop: i > 0 ? '1px solid rgb(var(--line))' : 'none' }}>
                        <td style={{ padding: '8px 20px', width: '70px' }}>
                          <span style={{ fontFamily: 'monospace', color: 'rgb(var(--ink-soft))' }}>{l.hesapKodu}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'rgb(var(--ink-soft))' }}>{accountName(l.hesapKodu)}</td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'monospace', color: l.borc ? 'rgb(var(--ink))' : 'rgb(var(--line))' }}>{l.borc ? fmt2(l.borc) : '·'}</td>
                        <td style={{ textAlign: 'right', padding: '8px 20px', fontFamily: 'monospace', color: l.alacak ? 'rgb(var(--ink))' : 'rgb(var(--line))' }}>{l.alacak ? fmt2(l.alacak) : '·'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '6px 20px', background: 'rgb(var(--paper))', fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', textAlign: 'right' }}>
                  Fiş toplamı: {fmt2(eb)}
                </div>
              </Card>
            )
          })}
        </div>
      ) : view === 'defter' ? (
        <DefterView selected={selectedAccount} onSelect={setSelectedAccount} mizan={mizan} />
      ) : (
        <GelirTablosuView />
      )}
    </div>
  )
}

function DefterView({ selected, onSelect, mizan }: { selected: string | null; onSelect: (k: string) => void; mizan: MizanRow[] }) {
  const code = selected ?? mizan[0]?.hesapKodu ?? null
  const rows = code ? buildDefter(code) : []

  return (
    <Card className="p-0">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--line))', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Label>Defter-i Kebir</Label>
        <select
          value={code ?? ''}
          onChange={e => onSelect(e.target.value)}
          style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgb(var(--line))', background: 'rgb(var(--surface))', color: 'rgb(var(--ink))', fontSize: '12px', fontFamily: 'monospace' }}
        >
          {mizan.map(r => <option key={r.hesapKodu} value={r.hesapKodu}>{r.hesapKodu} — {r.hesapAdi}</option>)}
        </select>
      </div>
      {rows.length === 0 ? (
        <EmptyState compact title="Hareket yok" hint="Bu hesapta kayıtlı işlem bulunmuyor." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgb(var(--ink-mute))', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '10px 20px' }}>Tarih</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Açıklama</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>Borç</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>Alacak</th>
              <th style={{ textAlign: 'right', padding: '10px 20px' }}>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgb(var(--line))' }}>
                <td style={{ padding: '9px 20px', fontFamily: 'monospace', color: 'rgb(var(--ink-mute))' }}>{r.tarih}</td>
                <td style={{ padding: '9px 12px', color: 'rgb(var(--ink-soft))' }}>{r.aciklama}</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', fontFamily: 'monospace', color: r.borc ? 'rgb(var(--ink))' : 'rgb(var(--line))' }}>{r.borc ? fmt2(r.borc) : '·'}</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', fontFamily: 'monospace', color: r.alacak ? 'rgb(var(--ink))' : 'rgb(var(--line))' }}>{r.alacak ? fmt2(r.alacak) : '·'}</td>
                <td style={{ textAlign: 'right', padding: '9px 20px', fontFamily: 'monospace', fontWeight: 500, color: r.bakiye >= 0 ? 'rgb(var(--ink))' : 'rgb(var(--crimson))' }}>{fmt2(Math.abs(r.bakiye))}{r.bakiye >= 0 ? ' B' : ' A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function GelirTablosuView() {
  const g = buildGelirTablosu()
  const row = (label: string, value: number, bold = false, indent = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgb(var(--line))', paddingLeft: indent ? '20px' : 0 }}>
      <span style={{ fontSize: '13px', color: bold ? 'rgb(var(--ink))' : 'rgb(var(--ink-soft))', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: bold ? 'rgb(var(--ink))' : 'rgb(var(--ink-soft))', fontWeight: bold ? 600 : 400 }}>{fmt(value)}</span>
    </div>
  )
  return (
    <Card className="p-6">
      <Label>Gelir Tablosu (Dönem)</Label>
      <div style={{ marginTop: '12px' }}>
        {row('Brüt Satışlar', g.brutSatis)}
        {row('Net Satışlar', g.netSatis, true)}
        {row('Satışların Maliyeti (-)', g.satisMaliyeti, false, true)}
        {row('Brüt Satış Karı', g.brutKar, true)}
        {row('Faaliyet Giderleri (-)', g.faaliyetGideri, false, true)}
        {row('Faaliyet Karı', g.faaliyetKari, true)}
      </div>
      <p style={{ marginTop: '14px', fontSize: '11px', color: 'rgb(var(--ink-mute))', lineHeight: 1.5 }}>
        Bu tablo yevmiye kayıtlarından (6xx hesapları) gerçek zamanlı türetilir. Stok ve amortisman kayıtları girildikçe maliyet satırları detaylanır.
      </p>
    </Card>
  )
}
