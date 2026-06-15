// Octo — İK Store
// Holds personnel and runs monthly payroll. Crucially, it derives the values
// that feed the other arms: SGK prim total → Vergi (SGK beyanname), gelir
// vergisi stopajı → Vergi (Muhtasar), net maaş total → Finans (cash outflow).
// İK is not a silo — these outputs are what make the SGK/KDV/cash collision real.

import { useSyncExternalStore } from 'react'
import { loadOrSeed, save } from '../../shared/store/persist'
import { isDemoMode } from '../../shared/config'
import { bordroHesapla, efektifBrut } from './bordroEngine'
import type { Personel, Bordro, BordroDonem } from './types'
import type { Puantaj, IzinTalebi, GunKaydi } from './attendanceTypes'
import { seedPersonel, seedPuantaj, seedIzinler } from './seedData'

interface IKState {
  personeller: Personel[]
  puantajlar: Puantaj[]
  izinler: IzinTalebi[]
}

const KEY = 'hr'
const emptyState: IKState = { personeller: [], puantajlar: [], izinler: [] }

function initial(): IKState {
  if (isDemoMode()) {
    const personeller = seedPersonel()
    return { personeller, puantajlar: seedPuantaj(personeller), izinler: seedIzinler(personeller) }
  }
  return emptyState
}

let loaded = loadOrSeed<IKState>(KEY, initial())
// Migration guard: state persisted before puantaj/izin existed lacks those
// arrays. Default them so views never call .find/.filter on undefined.
let state: IKState = {
  personeller: loaded.personeller ?? [],
  puantajlar: loaded.puantajlar ?? [],
  izinler: loaded.izinler ?? [],
}

const listeners = new Set<() => void>()
function emit() { save(KEY, state); listeners.forEach(l => l()) }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) }

export function getIKState(): IKState { return state }
export function useIKStore(): IKState {
  return useSyncExternalStore(subscribe, getIKState, getIKState)
}

export function addPersonel(p: Personel) {
  state = { ...state, personeller: [p, ...state.personeller] }
  emit()
}
export function updatePersonel(id: string, patch: Partial<Personel>) {
  state = { ...state, personeller: state.personeller.map(p => p.id === id ? { ...p, ...patch, id } : p) }
  emit()
}
export function deletePersonel(id: string) {
  state = { ...state, personeller: state.personeller.filter(p => p.id !== id) }
  emit()
}
export function seedIKDemo() {
  const personeller = seedPersonel()
  state = { personeller, puantajlar: seedPuantaj(personeller), izinler: seedIzinler(personeller) }
  emit()
}
export function clearIK() {
  state = emptyState
  emit()
}

// ── Puantaj actions ──────────────────────────────────────────────────────

export function getPuantaj(personelId: string, donem: string): Puantaj | undefined {
  return state.puantajlar.find(p => p.personelId === personelId && p.donem === donem)
}

export function setPuantaj(p: Puantaj) {
  const others = state.puantajlar.filter(x => !(x.personelId === p.personelId && x.donem === p.donem))
  state = { ...state, puantajlar: [...others, p] }
  emit()
}

// Recompute a puantaj's derived totals from its day records.
export function ozetlePuantaj(personelId: string, donem: string, gunler: GunKaydi[]): Puantaj {
  let calisanGun = 0, devamsizGun = 0, yillikIzinGun = 0, hastalikGun = 0, ucretsizIzinGun = 0, fazlaMesaiSaat = 0
  for (const g of gunler) {
    if (g.durum === 'tam' || g.durum === 'resmi_tatil' || g.durum === 'hafta_tatili' || g.durum === 'yillik_izin' || g.durum === 'hastalik') calisanGun += 1
    else if (g.durum === 'yarim') calisanGun += 0.5
    if (g.durum === 'devamsiz') devamsizGun += 1
    if (g.durum === 'yillik_izin') yillikIzinGun += 1
    if (g.durum === 'hastalik') hastalikGun += 1
    if (g.durum === 'ucretsiz_izin') ucretsizIzinGun += 1
    fazlaMesaiSaat += g.fazlaMesaiSaat ?? 0
  }
  return { personelId, donem, gunler, calisanGun, devamsizGun, yillikIzinGun, hastalikGun, ucretsizIzinGun, fazlaMesaiSaat }
}

// ── İzin actions ─────────────────────────────────────────────────────────

export function addIzin(i: IzinTalebi) {
  state = { ...state, izinler: [i, ...state.izinler] }
  emit()
}
export function setIzinDurumu(id: string, durum: IzinTalebi['durum']) {
  state = { ...state, izinler: state.izinler.map(i => i.id === id ? { ...i, durum } : i) }
  emit()
}
export function deleteIzin(id: string) {
  state = { ...state, izinler: state.izinler.filter(i => i.id !== id) }
  emit()
}
// Approved annual-leave days used, per personnel (for balance).
export function kullanilanYillikIzin(personelId: string): number {
  return state.izinler
    .filter(i => i.personelId === personelId && i.tur === 'yillik' && i.durum === 'onaylandi')
    .reduce((s, i) => s + i.gunSayisi, 0)
}

// ── Payroll run ──────────────────────────────────────────────────────────

// Run payroll for a given month for all active personnel. Cumulative matrah is
// approximated as (month index − 1) months of the same gross — a reasonable
// model for steady salaries; real cumulative would track actual history.
export function bordroDonemHesapla(donem: string): BordroDonem {
  const aktifler = state.personeller.filter(p => p.aktif)
  const ayIndex = parseInt(donem.split('-')[1] ?? '1', 10) // 1..12

  const bordrolar: Bordro[] = aktifler.map(p => {
    const sgkM = Math.min(p.brutMaas, p.brutMaas)
    const aylikMatrah = p.brutMaas - sgkM * 0.15
    const kumulatifOnce = aylikMatrah * (ayIndex - 1)
    // Attendance adjustment: unpaid days reduce gross, overtime adds.
    const pz = state.puantajlar.find(x => x.personelId === p.id && x.donem === donem)
    const effPersonel = pz
      ? { ...p, brutMaas: efektifBrut(p.brutMaas, { ucretsizGun: pz.devamsizGun + pz.ucretsizIzinGun, fazlaMesaiSaat: pz.fazlaMesaiSaat }) }
      : p
    return bordroHesapla({ personel: effPersonel, donem, kumulatifMatrahOnce: kumulatifOnce })
  })

  const sum = (f: (b: Bordro) => number) => bordrolar.reduce((s, b) => s + f(b), 0)

  const toplamSgkIsci = sum(b => b.sgkIsci + b.issizlikIsci)
  const toplamSgkIsveren = sum(b => b.sgkIsveren + b.issizlikIsveren)
  const toplamGelirVergisi = sum(b => b.gelirVergisi)
  const toplamDamga = sum(b => b.damgaVergisi)
  const toplamNet = sum(b => b.netMaas)

  return {
    donem,
    bordrolar,
    toplamBrut: sum(b => b.brutMaas),
    toplamNet,
    toplamSgkIsci,
    toplamSgkIsveren,
    toplamGelirVergisi,
    toplamDamga,
    toplamIsverenMaliyeti: sum(b => b.isverenMaliyeti),
    // Cross-arm outputs:
    sgkPrimToplam: toplamSgkIsci + toplamSgkIsveren,   // → SGK beyanname
    muhtasarToplam: toplamGelirVergisi + toplamDamga,  // → Muhtasar beyanname
    maasOdemesi: toplamNet,                             // → Finans cash outflow
  }
}

// Current-month payroll, used by the dashboard/orchestrator.
export function buBordroDonemi(): BordroDonem {
  const now = new Date()
  const donem = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return bordroDonemHesapla(donem)
}
