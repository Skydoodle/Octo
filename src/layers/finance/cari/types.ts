// Octo — Cari (Current Account) Schema
// A cari is a real, first-class entity: a customer or supplier with full contact
// details, not just a name buried in an invoice. This is what lets you open a
// company's card, see their balance, and call the number on file when they owe
// you money. Critical fields (phone, address) are required at creation so the
// "satıştaki arkadaş numara almamış" gap can't happen.

export type CariTip = 'musteri' | 'tedarikci' | 'her_ikisi'

export interface Cari {
  id: string
  unvan: string            // company/person name (required)
  vkn: string              // VKN/TCKN (required for invoiced caris)
  tip: CariTip
  // Contact — required so the card is actually usable for collections.
  telefon: string          // required
  adres: string            // required
  vergiDairesi: string
  yetkili: string          // contact person
  eposta: string
  not?: string
  perakende?: boolean      // true only for the single generic retail cari
  olusturulma: string      // ISO date
}

// Which fields are mandatory when creating a normal (non-retail) cari.
export const zorunluCariAlanlari: (keyof Cari)[] = ['unvan', 'vkn', 'telefon', 'adres']

export const cariAlanLabels: Record<string, string> = {
  unvan: 'Unvan / Ad',
  vkn: 'VKN / TCKN',
  telefon: 'Telefon',
  adres: 'Adres',
  vergiDairesi: 'Vergi Dairesi',
  yetkili: 'Yetkili Kişi',
  eposta: 'E-posta',
  not: 'Not',
}

// The fixed id for the single generic retail customer (perakende).
export const PERAKENDE_CARI_ID = 'cari-perakende'

export function makePerakendeCari(): Cari {
  return {
    id: PERAKENDE_CARI_ID,
    unvan: 'Perakende Müşteri',
    vkn: '11111111111',
    tip: 'musteri',
    telefon: '',
    adres: '',
    vergiDairesi: '',
    yetkili: '',
    eposta: '',
    perakende: true,
    olusturulma: new Date().toISOString().slice(0, 10),
  }
}

// Report which required fields are missing on a cari (for validation + warnings).
export function eksikAlanlar(c: Partial<Cari>): (keyof Cari)[] {
  if (c.perakende) return []
  return zorunluCariAlanlari.filter(f => !String(c[f] ?? '').trim())
}
