import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import layoutSource from '../../../surfaces/dashboard/Layout.tsx?raw'
import salesLayoutSource from '../ui/SalesLayout.tsx?raw'
import modalSource from './SalesImportModal.tsx?raw'
import type { BusinessParty } from '../crm/types'
import { assignFirm, createTemplateWorkbook, importSummary, maskSensitiveTaxId, parseRelationshipStatus, parseRoles, prepareContactRows, prepareFirmRows, recognizeColumns, recognizeImportType, validateFileName } from './salesImport'

const firm = (overrides:Partial<BusinessParty>={}):BusinessParty=>({id:'p1',companyId:'c1',partyType:'organization',displayName:'Kuzey Teknoloji',legalName:null,taxId:'1234567890',taxOffice:null,mainPhone:null,mainEmail:null,website:null,sector:null,city:null,countryCode:'TR',address:null,relationshipStatus:'active',source:null,notes:null,normalizedName:'kuzey teknoloji',normalizedTaxId:'1234567890',archivedAt:null,createdBy:'u',updatedBy:'u',createdAt:'2026-01-01',updatedAt:'2026-01-01',roles:['customer'],...overrides})

describe('Sales import recognition and parsing',()=>{
  it('accepts Excel and CSV file types and rejects unrelated files',()=>{expect(validateFileName('firmalar.xlsx')).toBeNull();expect(validateFileName('kisiler.XLS')).toBeNull();expect(validateFileName('veri.csv')).toBeNull();expect(validateFileName('veri.pdf')).toContain('.xlsx')})
  it('recognizes firm and contact columns safely',()=>{expect(recognizeImportType(['Firma adı','Roller','VKN / TCKN'])).toBe('firms');expect(recognizeImportType(['Firma VKN / TCKN','Ad','Soyad','Karar rolü'])).toBe('contacts')})
  it('supports manual column mapping after automatic recognition',()=>{const mapping=recognizeColumns(['Müşteri','Rol Bilgisi'],'firms');expect(mapping).toEqual({Müşteri:'','Rol Bilgisi':''});expect({...mapping,Müşteri:'displayName','Rol Bilgisi':'roles'}).toMatchObject({Müşteri:'displayName', 'Rol Bilgisi':'roles'})})
  it('parses multiple Turkish and internal roles',()=>{expect(parseRoles('Potansiyel, customer | Tedarikçi; İş Ortağı')).toEqual(['prospect','customer','supplier','partner']);expect(parseRoles('owner')).toBeNull()})
  it('parses Turkish and internal relationship statuses',()=>{expect(parseRelationshipStatus('Aktif')).toBe('active');expect(parseRelationshipStatus('lost')).toBe('lost');expect(parseRelationshipStatus('bilinmiyor')).toBeNull()})
})

describe('Sales import row validation',()=>{
  const firmMapping={'Firma adı':'displayName','Roller':'roles','VKN':'taxId','Durum':'relationshipStatus'}
  it('validates firms and identifies duplicate tax IDs without exposing them',()=>{const rows=prepareFirmRows([{'Firma adı':'Yeni Firma','Roller':'Müşteri','VKN':'1234567890','Durum':'Aktif'}],firmMapping,[firm()]);expect(rows[0].status).toBe('Mükerrer');expect(rows[0].taxIdMasked).toBe('••••7890');expect(rows[0].message).not.toContain('1234567890')})
  it('requires a firm name and at least one valid role',()=>{const rows=prepareFirmRows([{'Firma adı':'','Roller':'','VKN':'','Durum':''}],firmMapping,[]);expect(rows[0].status).toBe('Eksik bilgi');expect(rows[0].selected).toBe(false)})
  const contactMapping={'Firma VKN':'firmTaxId','Firma':'firmName','Ad':'firstName','E-posta':'email','Birincil':'isPrimary'}
  it('matches contacts by normalized tax ID before name',()=>{const rows=prepareContactRows([{'Firma VKN':'123-456-7890','Firma':'Başka İsim','Ad':'Ada','E-posta':'ada@example.test','Birincil':''}],contactMapping,[firm()]);expect(rows[0].status).toBe('Hazır');expect(rows[0].input).toMatchObject({partyId:'p1',firstName:'Ada'})})
  it('uses a non-sensitive preview label even when the tax column comes first',()=>{const rows=prepareContactRows([{'Firma VKN':'1234567890','Firma':'Kuzey Teknoloji','Ad':'Ada','E-posta':'','Birincil':''}],contactMapping,[firm()]);expect(rows[0].raw['Kayıt']).toBe('Ada');expect(rows[0].raw['Kayıt']).not.toContain('1234567890')})
  it('matches contacts by exact normalized firm name',()=>{const rows=prepareContactRows([{'Firma VKN':'','Firma':'  KUZEY   TEKNOLOJİ ','Ad':'Ada','E-posta':'','Birincil':''}],contactMapping,[firm()]);expect(rows[0].status).toBe('Hazır')})
  it('marks unresolved and ambiguous matches for explicit selection',()=>{const missing=prepareContactRows([{'Firma VKN':'','Firma':'Yok','Ad':'Ada','E-posta':'','Birincil':''}],contactMapping,[firm()]);expect(missing[0].status).toBe('Eşleşme gerekli');const ambiguous=prepareContactRows([{'Firma VKN':'','Firma':'Kuzey Teknoloji','Ad':'Ada','E-posta':'','Birincil':''}],contactMapping,[firm(),firm({id:'p2'})]);expect(ambiguous[0].candidateIds).toHaveLength(2);expect(assignFirm(ambiguous[0],'p2')).toMatchObject({status:'Hazır',selected:true,input:{partyId:'p2'}})})
  it('tracks preview exclusions and honest partial result summaries',()=>{const ready=prepareFirmRows([{'Firma adı':'A','Roller':'Müşteri','VKN':'','Durum':''}],firmMapping,[])[0];const rows=[{...ready,selected:false},{...ready,index:1,status:'İçe aktarıldı' as const,selected:false},{...ready,index:2,status:'Aktarılamadı' as const,selected:false}];expect(importSummary(rows)).toMatchObject({selected:0,succeeded:1,failed:1})})
  it('masks sensitive tax IDs',()=>{expect(maskSensitiveTaxId('12 34-56-7890')).toBe('••••7890');expect(maskSensitiveTaxId('')).toBe('—')})
})

describe('Sales import templates and interface',()=>{
  it('generates fictional firm and contact templates with headers',()=>{for(const type of ['firms','contacts'] as const){const workbook=createTemplateWorkbook(type);const data=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]],{header:1});expect(data).toHaveLength(2);expect(String(data[1])).toContain('Örnek')}})
  it('uses the exact navigation order on desktop and mobile shared navigation',()=>{const labels=['Finans','Vergi','İnsan & Bordro','Operasyon','Satış ve Teklifler'];const positions=labels.map(label=>layoutSource.indexOf(`label: '${label}'`));expect(positions).toEqual([...positions].sort((a,b)=>a-b));expect(layoutSource).toContain('<Navigation openData=')})
  it('hides the actionable import control from accountants',()=>{expect(salesLayoutSource).toContain('canImport &&');expect(salesLayoutSource).toContain('canWriteCRM(activeCompany)');expect(salesLayoutSource).toContain('Excel’den aktar')})
  it('writes only through existing repository functions and shows staged confirmation',()=>{expect(modalSource).toContain('createBusinessParty');expect(modalSource).toContain('createBusinessContact');expect(modalSource).not.toContain("from('business_parties')");expect(modalSource).toContain('Seçili satırları içe aktar');expect(modalSource).toContain('Aktarılamadı')})
  it('does not present unfinished Sales areas as implemented',()=>{expect(modalSource).not.toMatch(/Fırsatlar|Pipeline|Teklif oluştur|Satış sipariş|Müşteri Sağlığı/)})
})
