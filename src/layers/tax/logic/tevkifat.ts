// Octo — KDV Tevkifat Engine
// Encodes Turkish KDV withholding (tevkifat) logic as structured rules.
//
// In tevkifat, the buyer withholds part of the calculated KDV and remits it
// directly to the state (2 No'lu KDV beyannamesi), paying the seller only the
// non-withheld part. The withholding ratio varies by service category and is
// set by the KDV Genel Uygulama Tebliği. This table is the maintained
// regulatory artifact: when a tebliğ changes a ratio, only this table changes.

export type TevkifatOrani = '2/10' | '3/10' | '4/10' | '5/10' | '7/10' | '9/10' | '10/10'

export const tevkifatOranlari: TevkifatOrani[] = ['2/10', '3/10', '4/10', '5/10', '7/10', '9/10', '10/10']

// Numerator of p/10
export function tevkifatPayi(oran: TevkifatOrani): number {
  return parseInt(oran.split('/')[0], 10)
}

// Representative service categories -> withholding ratio.
// Per the KDV Genel Uygulama Tebliği. Ratios are periodically revised.
export interface TevkifatKategori {
  kod: string
  ad: string
  oran: TevkifatOrani
}

export const tevkifatKategorileri: TevkifatKategori[] = [
  { kod: 'yapim', ad: 'Yapım işleri ve mühendislik-mimarlık', oran: '4/10' },
  { kod: 'temizlik', ad: 'Temizlik, çevre ve bahçe bakımı', oran: '9/10' },
  { kod: 'isgucu', ad: 'İşgücü temin hizmeti', oran: '9/10' },
  { kod: 'danismanlik', ad: 'Danışmanlık ve denetim', oran: '9/10' },
  { kod: 'tadilbakim', ad: 'Makine/teçhizat tadil, bakım, onarım', oran: '7/10' },
  { kod: 'yemek', ad: 'Yemek servisi ve organizasyon', oran: '5/10' },
  { kod: 'fason', ad: 'Fason tekstil ve konfeksiyon', oran: '7/10' },
  { kod: 'baski', ad: 'Baskı ve basım', oran: '7/10' },
  { kod: 'reklam', ad: 'Ticari reklam', oran: '3/10' },
  { kod: 'diger', ad: 'Diğer hizmetler (kamuya)', oran: '5/10' },
]

export interface TevkifatHesap {
  hesaplananKDV: number     // full KDV on the line
  tevkifEdilenKDV: number   // withheld by buyer -> remitted via 2 No'lu
  saticidaKalanKDV: number  // collected by seller -> declared in 1 No'lu
}

// Compute the tevkifat split for a single amount.
export function hesaplaTevkifat(matrah: number, kdvOrani: number, oran: TevkifatOrani): TevkifatHesap {
  const hesaplananKDV = matrah * (kdvOrani / 100)
  const pay = tevkifatPayi(oran)
  const tevkifEdilenKDV = hesaplananKDV * (pay / 10)
  const saticidaKalanKDV = hesaplananKDV - tevkifEdilenKDV
  return { hesaplananKDV, tevkifEdilenKDV, saticidaKalanKDV }
}
