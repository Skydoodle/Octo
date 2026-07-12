import * as XLSX from 'xlsx'
import type { BusinessContactCreateInput, BusinessParty, BusinessPartyCreateInput, BusinessPartyRoleName, BusinessRelationshipStatus, ContactDecisionRole, PreferredContactChannel } from '../crm/types'
import { normalizeContactCreateInput, normalizeName, normalizePartyCreateInput, normalizeTaxId } from '../crm/validation'

export type SalesImportType = 'firms' | 'contacts'
export type ImportRowStatus = 'Hazır' | 'Eksik bilgi' | 'Eşleşme gerekli' | 'Mükerrer' | 'Geçersiz' | 'İçe aktarıldı' | 'Aktarılamadı'
export type RawRow = Record<string, string>
export type ColumnMapping = Record<string, string>

export const firmFields = ['displayName','legalName','taxId','roles','relationshipStatus','taxOffice','mainPhone','mainEmail','website','sector','city','countryCode','source','address','notes'] as const
export const contactFields = ['firmTaxId','firmName','firstName','lastName','jobTitle','department','email','phone','preferredChannel','decisionRole','isPrimary','notes'] as const
export const fieldLabels: Record<string, string> = {
  displayName:'Firma adı', legalName:'Resmî unvan', taxId:'VKN / TCKN', roles:'Roller', relationshipStatus:'İlişki durumu', taxOffice:'Vergi dairesi', mainPhone:'Telefon', mainEmail:'E-posta', website:'Web sitesi', sector:'Sektör', city:'Şehir', countryCode:'Ülke', source:'Kaynak', address:'Adres', notes:'Notlar', firmTaxId:'Firma VKN / TCKN', firmName:'Firma adı', firstName:'Ad', lastName:'Soyad', jobTitle:'Unvan', department:'Departman', email:'E-posta', phone:'Telefon', preferredChannel:'Tercih edilen kanal', decisionRole:'Karar rolü', isPrimary:'Birincil kişi',
}

const fold = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('tr-TR').replace(/[._/()-]+/g, ' ').replace(/\s+/g, ' ')
const aliases: Record<string,string[]> = {
  displayName:['firma adı','firma adi','şirket adı','sirket adi','display name'], legalName:['resmî unvan','resmi unvan','legal name'], taxId:['vkn tckn','vkn','tckn','tax id'], roles:['roller','rol','roles'], relationshipStatus:['ilişki durumu','iliski durumu','relationship status'], taxOffice:['vergi dairesi','tax office'], mainPhone:['telefon','ana telefon','phone'], mainEmail:['e posta','eposta','ana e posta','email'], website:['web sitesi','website'], sector:['sektör','sektor','sector'], city:['şehir','sehir','city'], countryCode:['ülke','ulke','country','country code'], source:['kaynak','source'], address:['adres','address'], notes:['notlar','not','notes'],
  firmTaxId:['firma vkn tckn','firma vkn','firma tckn'], firmName:['firma adı','firma adi','şirket adı','sirket adi'], firstName:['ad','isim','first name'], lastName:['soyad','soyisim','last name'], jobTitle:['unvan','görev','gorev','job title'], department:['departman','department'], email:['e posta','eposta','email'], phone:['telefon','phone'], preferredChannel:['tercih edilen kanal','iletişim kanalı','iletisim kanali','preferred channel'], decisionRole:['karar rolü','karar rolu','decision role'], isPrimary:['birincil kişi','birincil kisi','primary'],
}

export function validateFileName(name: string): string | null { return /\.(xlsx|xls|csv)$/i.test(name) ? null : 'Yalnızca .xlsx, .xls veya .csv dosyaları kullanılabilir.' }
export function recognizeColumns(headers: string[], type: SalesImportType): ColumnMapping {
  const fields = type === 'firms' ? firmFields : contactFields
  return Object.fromEntries(headers.map(header => {
    const normalized = fold(header)
    const field = fields.find(candidate => aliases[candidate]?.some(alias => fold(alias) === normalized))
    return [header, field ?? '']
  }))
}
export function recognizeImportType(headers: string[]): SalesImportType | null {
  const firms = Object.values(recognizeColumns(headers,'firms')).filter(Boolean).length
  const contacts = Object.values(recognizeColumns(headers,'contacts')).filter(Boolean).length
  if (contacts >= 3 && contacts > firms) return 'contacts'
  if (firms >= 2) return 'firms'
  return null
}
export async function parseSalesFile(file: File): Promise<{ headers:string[]; rows:RawRow[] }> {
  if (validateFileName(file.name)) throw new Error(validateFileName(file.name)!)
  const workbook = XLSX.read(await file.arrayBuffer(), { type:'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { headers:[], rows:[] }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header:1, defval:'', raw:false })
  const headers = (matrix[0] ?? []).map(value => String(value).trim())
  const rows = matrix.slice(1).filter(row => row.some(value => String(value).trim())).map(row => Object.fromEntries(headers.map((header,index) => [header,String(row[index] ?? '').trim()])))
  return { headers, rows }
}
const mapped = (row: RawRow, mapping:ColumnMapping) => Object.fromEntries(Object.entries(mapping).filter(([,field]) => field).map(([header,field]) => [field,row[header] ?? '']))

const roleValues:Record<string,BusinessPartyRoleName> = { potansiyel:'prospect', prospect:'prospect', müşteri:'customer', musteri:'customer', customer:'customer', tedarikçi:'supplier', tedarikci:'supplier', supplier:'supplier', 'iş ortağı':'partner', 'is ortagi':'partner', partner:'partner', diğer:'other', diger:'other', other:'other' }
export function parseRoles(value:string): BusinessPartyRoleName[] | null {
  const values = [...new Set(value.split(/[,;|]/).map(part => roleValues[fold(part)]).filter(Boolean))]
  const supplied = value.split(/[,;|]/).filter(part => part.trim()).length
  return values.length && values.length === supplied ? values : null
}
const statusValues:Record<string,BusinessRelationshipStatus> = { potansiyel:'potential', potential:'potential', aktif:'active', active:'active', pasif:'inactive', inactive:'inactive', kaybedildi:'lost', lost:'lost', diğer:'other', diger:'other', other:'other' }
export const parseRelationshipStatus = (value:string):BusinessRelationshipStatus|null => value.trim() ? statusValues[fold(value)] ?? null : 'potential'
const channelValues:Record<string,PreferredContactChannel> = { 'e posta':'email', email:'email', telefon:'phone', phone:'phone', whatsapp:'whatsapp', diğer:'other', diger:'other', other:'other' }
const decisionValues:Record<string,ContactDecisionRole> = { 'karar verici':'decision_maker', decision_maker:'decision_maker', etkileyici:'influencer', influencer:'influencer', 'teknik değerlendirici':'technical', technical:'technical', kullanıcı:'user', kullanici:'user', user:'user', 'satın alma':'procurement', procurement:'procurement', finans:'finance', finance:'finance', onaylayan:'approver', approver:'approver', diğer:'other', diger:'other', other:'other' }
const booleanValue = (value:string) => ['evet','yes','true','1'].includes(fold(value))

export interface PreparedImportRow { index:number; raw:RawRow; status:ImportRowStatus; message:string|null; selected:boolean; input:BusinessPartyCreateInput|BusinessContactCreateInput|null; taxIdMasked:string|null; candidateIds:string[] }
export function maskSensitiveTaxId(value:string|null|undefined):string { const clean=normalizeTaxId(value); return clean ? `••••${clean.slice(-4)}` : '—' }

export function prepareFirmRows(rows:RawRow[], mapping:ColumnMapping, existing:BusinessParty[]):PreparedImportRow[] {
  const existingTax = new Set(existing.map(p=>p.normalizedTaxId).filter(Boolean)); const fileTax = new Set<string>()
  return rows.map((raw,index) => {
    const value=mapped(raw,mapping); raw={...raw,'Kayıt':value.displayName||'Adsız firma'}; const roles=parseRoles(value.roles || ''); const status=parseRelationshipStatus(value.relationshipStatus || '')
    const input:BusinessPartyCreateInput={ displayName:value.displayName||'', legalName:value.legalName, taxId:value.taxId, roles:roles??[], relationshipStatus:status??'potential', taxOffice:value.taxOffice, mainPhone:value.mainPhone, mainEmail:value.mainEmail, website:value.website, sector:value.sector, city:value.city, countryCode:value.countryCode||'TR', source:value.source, address:value.address, notes:value.notes }
    const checked=normalizePartyCreateInput(input); const tax=normalizeTaxId(value.taxId)
    if (tax && (existingTax.has(tax) || fileTax.has(tax))) return {index,raw,status:'Mükerrer',message:'Bu vergi kimliğiyle bir firma zaten bulunuyor.',selected:false,input:checked.value,taxIdMasked:maskSensitiveTaxId(tax),candidateIds:[]}
    if (tax) fileTax.add(tax)
    if (!value.displayName?.trim() || !value.roles?.trim()) return {index,raw,status:'Eksik bilgi',message:'Firma adı ve en az bir rol gereklidir.',selected:false,input:null,taxIdMasked:maskSensitiveTaxId(tax),candidateIds:[]}
    if (!roles || !status || !checked.value) return {index,raw,status:'Geçersiz',message:checked.error ?? 'Rol veya ilişki durumu geçersiz.',selected:false,input:null,taxIdMasked:maskSensitiveTaxId(tax),candidateIds:[]}
    return {index,raw,status:'Hazır',message:null,selected:true,input:checked.value,taxIdMasked:maskSensitiveTaxId(tax),candidateIds:[]}
  })
}
export function matchFirm(value:Record<string,string>, parties:BusinessParty[]):BusinessParty[] {
  const tax=normalizeTaxId(value.firmTaxId); if (tax) { const matches=parties.filter(p=>p.normalizedTaxId===tax); if(matches.length) return matches }
  const name=value.firmName?.trim(); return name ? parties.filter(p=>normalizeName(p.displayName)===normalizeName(name) || (p.legalName ? normalizeName(p.legalName)===normalizeName(name):false)) : []
}
export function prepareContactRows(rows:RawRow[],mapping:ColumnMapping,parties:BusinessParty[]):PreparedImportRow[] {
  return rows.map((raw,index)=>{ const value=mapped(raw,mapping); raw={...raw,'Kayıt':[value.firstName,value.lastName].filter(Boolean).join(' ')||'Adsız kişi'}; const matches=matchFirm(value,parties); const base:BusinessContactCreateInput={partyId:matches[0]?.id??'',firstName:value.firstName||'',lastName:value.lastName,jobTitle:value.jobTitle,department:value.department,email:value.email,phone:value.phone,preferredChannel:value.preferredChannel?channelValues[fold(value.preferredChannel)]??null:null,decisionRole:value.decisionRole?decisionValues[fold(value.decisionRole)]??null:null,isPrimary:booleanValue(value.isPrimary||''),notes:value.notes}
    if(!value.firstName?.trim()) return {index,raw,status:'Eksik bilgi',message:'Firma eşleşmesi ve ad gereklidir.',selected:false,input:null,taxIdMasked:maskSensitiveTaxId(value.firmTaxId),candidateIds:matches.map(p=>p.id)}
    if(matches.length!==1) return {index,raw,status:'Eşleşme gerekli',message:matches.length?'Birden fazla firma eşleşti. Firma seçin.':'Eşleşen firma bulunamadı.',selected:false,input:base,taxIdMasked:maskSensitiveTaxId(value.firmTaxId),candidateIds:matches.map(p=>p.id)}
    const checked=normalizeContactCreateInput(base); if(!checked.value) return {index,raw,status:'Geçersiz',message:checked.error,selected:false,input:null,taxIdMasked:maskSensitiveTaxId(value.firmTaxId),candidateIds:[matches[0].id]}
    return {index,raw,status:'Hazır',message:null,selected:true,input:checked.value,taxIdMasked:maskSensitiveTaxId(value.firmTaxId),candidateIds:[matches[0].id]}
  })
}
export function assignFirm(row:PreparedImportRow,partyId:string):PreparedImportRow { if(!partyId)return {...row,status:'Eşleşme gerekli',selected:false}; const base=row.input as BusinessContactCreateInput; const checked=normalizeContactCreateInput({...base,partyId}); return checked.value?{...row,status:'Hazır',message:null,selected:true,input:checked.value,candidateIds:[partyId]}:{...row,status:'Geçersiz',message:checked.error,selected:false} }
export function importSummary(rows:PreparedImportRow[]) { return { total:rows.length, valid:rows.filter(r=>r.status==='Hazır'||r.status==='İçe aktarıldı').length, invalid:rows.filter(r=>['Eksik bilgi','Geçersiz','Aktarılamadı'].includes(r.status)).length, duplicates:rows.filter(r=>r.status==='Mükerrer').length, unresolved:rows.filter(r=>r.status==='Eşleşme gerekli').length, selected:rows.filter(r=>r.selected&&r.status==='Hazır').length, succeeded:rows.filter(r=>r.status==='İçe aktarıldı').length, failed:rows.filter(r=>r.status==='Aktarılamadı').length } }

export function createTemplateWorkbook(type:SalesImportType):XLSX.WorkBook { const headers=(type==='firms'?firmFields:contactFields).map(f=>fieldLabels[f]); const example=type==='firms'?['Örnek Rüzgâr Teknoloji AŞ','Örnek Rüzgâr Teknoloji Anonim Şirketi','1234567890','Potansiyel | Müşteri','Potansiyel','Örnek Vergi Dairesi','+90 212 000 00 00','merhaba@ornek-ruzgar.test','https://ornek-ruzgar.test','Teknoloji','İstanbul','TR','Fuar','Örnek Mahallesi','Tamamen kurgusal örnek kayıt']:['1234567890','Örnek Rüzgâr Teknoloji AŞ','Deniz','Yılmaz','Satış Direktörü','Satış','deniz@ornek-ruzgar.test','+90 555 000 00 00','E-posta','Karar Verici','Evet','Tamamen kurgusal örnek kişi']; const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([headers,example]),type==='firms'?'Firmalar':'Kişiler');return workbook }
export function downloadTemplate(type:SalesImportType) { XLSX.writeFile(createTemplateWorkbook(type),type==='firms'?'octo-firma-ice-aktarma-sablonu.xlsx':'octo-kisi-ice-aktarma-sablonu.xlsx') }
