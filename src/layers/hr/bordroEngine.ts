// Octo — Bordro Engine
// Computes a Turkish payroll slip from gross salary, applying 2026 rules:
// SGK işçi (%14), işsizlik (%1), cumulative income-tax brackets, stamp tax,
// and the asgari ücret istisnası (the minimum-wage-equivalent portion of every
// salary is exempt from income + stamp tax).
//
// The cumulative-matrah logic is the hard part: a worker's marginal tax bracket
// depends on year-to-date taxable income, so the same gross is taxed differently
// in January vs. December. This is exactly the kind of regulatory logic Octo
// encodes as computation rather than leaving to a human + spreadsheet.

import {
  BORDRO_2026, GELIR_VERGISI_DILIMLERI_2026,
  type Personel, type Bordro,
} from './types'

// Income tax on a slice of cumulative matrah [from, to], walking the brackets.
// Returns the tax owed on the income earned *this month* (the slice), given how
// much cumulative matrah was already used up before this month.
function gelirVergisiHesapla(kumulatifOnce: number, buAyMatrah: number): number {
  let tax = 0
  let remaining = buAyMatrah
  let cursor = kumulatifOnce

  for (const dilim of GELIR_VERGISI_DILIMLERI_2026) {
    if (remaining <= 0) break
    if (cursor >= dilim.limit) continue
    // How much of this month's matrah falls into this bracket?
    const roomInBracket = dilim.limit - Math.max(cursor, dilim.alt)
    const taxedHere = Math.min(remaining, roomInBracket)
    if (taxedHere > 0) {
      tax += taxedHere * dilim.rate
      remaining -= taxedHere
      cursor += taxedHere
    }
  }
  return tax
}

export interface BordroGirdi {
  personel: Personel
  donem: string                 // 2026-MM
  kumulatifMatrahOnce: number   // cumulative taxable income before this month
}

// Compute one personnel member's payroll slip for one month.
export function bordroHesapla({ personel, donem, kumulatifMatrahOnce }: BordroGirdi): Bordro {
  const brut = personel.brutMaas
  const P = BORDRO_2026

  // SGK base is capped at the tavan.
  const sgkMatrah = Math.min(brut, P.sgkTavan)

  // Employee deductions
  const sgkIsci = sgkMatrah * P.sgkIsciOrani
  const issizlikIsci = sgkMatrah * P.issizlikIsciOrani

  // Income tax matrah = gross − SGK işçi − işsizlik işçi
  const gelirVergisiMatrahi = brut - sgkIsci - issizlikIsci

  // Gross income tax (before exemption), using cumulative brackets.
  const gelirVergisiHam = gelirVergisiHesapla(kumulatifMatrahOnce, gelirVergisiMatrahi)

  // Asgari ücret istisnası: the income tax computed on the minimum-wage portion
  // is exempt. We compute the tax on the asgari ücret's own matrah at the
  // worker's current cumulative position and subtract it (capped at the tax due).
  const asgariMatrah = P.asgariUcretBrut - P.asgariUcretBrut * (P.sgkIsciOrani + P.issizlikIsciOrani)
  const asgariVergiIstisna = Math.min(
    gelirVergisiHesapla(kumulatifMatrahOnce, asgariMatrah),
    gelirVergisiHam,
  )
  const gelirVergisi = Math.max(0, gelirVergisiHam - asgariVergiIstisna)

  // Stamp tax on gross, with the asgari ücret portion exempt.
  const damgaHam = brut * P.damgaVergisiOrani
  const damgaIstisna = P.asgariUcretBrut * P.damgaVergisiOrani
  const damgaVergisi = Math.max(0, damgaHam - damgaIstisna)

  const toplamKesinti = sgkIsci + issizlikIsci + gelirVergisi + damgaVergisi
  const netMaas = brut - toplamKesinti

  // Employer cost
  const sgkIsverenOrani = personel.sgkIndirimli ? P.sgkIsverenIndirimliOrani : P.sgkIsverenOrani
  const sgkIsveren = sgkMatrah * sgkIsverenOrani
  const issizlikIsveren = sgkMatrah * P.issizlikIsverenOrani
  const isverenMaliyeti = brut + sgkIsveren + issizlikIsveren

  return {
    personelId: personel.id,
    donem,
    brutMaas: brut,
    sgkIsci,
    issizlikIsci,
    gelirVergisiMatrahi,
    gelirVergisi,
    gelirVergisiIstisna: asgariVergiIstisna,
    damgaVergisi,
    damgaVergisiIstisna: damgaIstisna,
    toplamKesinti,
    netMaas,
    sgkIsveren,
    issizlikIsveren,
    isverenMaliyeti,
    kumulatifMatrah: kumulatifMatrahOnce + gelirVergisiMatrahi,
  }
}

// Quick helper: net salary from gross for display (single month, no cumulative).
export function brutToNet(brut: number, sgkIndirimli = false): { net: number; isverenMaliyeti: number } {
  const dummy: Personel = {
    id: '_', ad: '', soyad: '', tcKimlik: '', iseGirisTarihi: '',
    brutMaas: brut, departman: '', pozisyon: '', sgkDurumu: 'normal',
    calismaSekli: 'tam_zamanli', sgkIndirimli, aktif: true,
  }
  const b = bordroHesapla({ personel: dummy, donem: '2026-01', kumulatifMatrahOnce: 0 })
  return { net: b.netMaas, isverenMaliyeti: b.isverenMaliyeti }
}

// Attendance-adjusted gross: unpaid days (devamsız, ücretsiz izin) reduce the
// month's gross pro-rata over 30 days; overtime hours add at 1.5x hourly.
export interface PuantajGirdi {
  ucretsizGun: number      // devamsız + ücretsiz izin
  fazlaMesaiSaat: number
}

export function efektifBrut(tamBrut: number, p: PuantajGirdi): number {
  const gunlukUcret = tamBrut / 30
  const saatUcret = tamBrut / 225 // ~30 gün x 7.5 saat
  const eksik = Math.max(0, p.ucretsizGun) * gunlukUcret
  const mesai = Math.max(0, p.fazlaMesaiSaat) * saatUcret * 1.5
  return Math.max(0, tamBrut - eksik + mesai)
}
