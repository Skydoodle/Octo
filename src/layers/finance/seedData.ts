import { BankAccount, Invoice, Transaction } from './types'

export const seedAccounts: BankAccount[] = [
  { id: 'acc1', name: 'Ziraat TRY', iban: 'TR33 0001 0017 4538 0731 5000 01', currency: 'TRY', balance: 284000 },
  { id: 'acc2', name: 'Is Bankasi TRY', iban: 'TR06 0006 4000 0011 2345 6789 01', currency: 'TRY', balance: 118000 },
  { id: 'acc3', name: 'Garanti USD', iban: 'TR09 0006 2000 1234 0006 2993 26', currency: 'USD', balance: 12400 },
]

export const seedInvoices: Invoice[] = [
  { id: 'inv1', type: 'sales', contactName: 'Tekstil AS', contactTaxId: '1234567890', amount: 42000, vatAmount: 8400, total: 50400, vatRate: 20, currency: 'TRY', issueDate: '2026-05-01', dueDate: '2026-05-31', status: 'sent', description: 'Danismanlik hizmetleri' },
  { id: 'inv2', type: 'sales', contactName: 'Insaat Ltd', contactTaxId: '9876543210', amount: 28000, vatAmount: 5600, total: 33600, vatRate: 20, currency: 'TRY', issueDate: '2026-04-15', dueDate: '2026-05-15', status: 'overdue', description: 'Proje yonetimi' },
  { id: 'inv3', type: 'sales', contactName: 'Gida San AS', contactTaxId: '1122334455', amount: 15000, vatAmount: 3000, total: 18000, vatRate: 20, currency: 'TRY', issueDate: '2026-05-10', dueDate: '2026-06-10', status: 'sent', description: 'Yazilim lisansi' },
  { id: 'inv4', type: 'sales', contactName: 'Lojistik AS', contactTaxId: '5566778899', amount: 8500, vatAmount: 1700, total: 10200, vatRate: 20, currency: 'TRY', issueDate: '2026-05-20', dueDate: '2026-06-20', status: 'sent', description: 'Aylik destek' },
  { id: 'inv5', type: 'sales', contactName: 'Perakende Ltd', contactTaxId: '6677889900', amount: 62000, vatAmount: 12400, total: 74400, vatRate: 20, currency: 'TRY', issueDate: '2026-05-05', dueDate: '2026-05-05', status: 'paid', description: 'Yillik lisans' },
  { id: 'inv6', type: 'purchase', contactName: 'Ofis Malzemeleri', contactTaxId: '1112223334', amount: 4200, vatAmount: 840, total: 5040, vatRate: 20, currency: 'TRY', issueDate: '2026-05-03', dueDate: '2026-05-25', status: 'sent', description: 'Ofis malzemeleri' },
  { id: 'inv7', type: 'purchase', contactName: 'Maslak Plaza', contactTaxId: '4445556667', amount: 45000, vatAmount: 9000, total: 54000, vatRate: 20, currency: 'TRY', issueDate: '2026-05-01', dueDate: '2026-05-10', status: 'paid', description: 'Mayis kirasi' },
  { id: 'inv8', type: 'purchase', contactName: 'Bulut Hizmetleri', contactTaxId: '7778889990', amount: 8500, vatAmount: 1700, total: 10200, vatRate: 20, currency: 'TRY', issueDate: '2026-05-01', dueDate: '2026-05-31', status: 'sent', description: 'Sunucu altyapi' },
  { id: 'inv9', type: 'purchase', contactName: 'Hukuk Burosu', contactTaxId: '3334445556', amount: 12000, vatAmount: 2400, total: 14400, vatRate: 20, currency: 'TRY', issueDate: '2026-05-15', dueDate: '2026-06-15', status: 'sent', description: 'Hukuki danismanlik' },
]

export const seedTransactions: Transaction[] = [
  { id: 'tx1', date: '2026-05-20', description: 'Perakende Ltd odeme', amount: 74400, type: 'income', category: 'Satis Geliri', accountId: 'acc1', invoiceId: 'inv5' },
  { id: 'tx2', date: '2026-05-10', description: 'Maslak Plaza kira', amount: -54000, type: 'expense', category: 'Kira', accountId: 'acc1', invoiceId: 'inv7' },
  { id: 'tx3', date: '2026-05-15', description: 'Maas odemeleri', amount: -142800, type: 'expense', category: 'Personel', accountId: 'acc1', invoiceId: null },
  { id: 'tx4', date: '2026-05-18', description: 'Tekstil AS avans', amount: 25000, type: 'income', category: 'Satis Geliri', accountId: 'acc2', invoiceId: 'inv1' },
  { id: 'tx5', date: '2026-05-12', description: 'Bulut hizmetleri', amount: -10200, type: 'expense', category: 'Teknoloji', accountId: 'acc2', invoiceId: 'inv8' },
  { id: 'tx6', date: '2026-05-08', description: 'Ofis malzemeleri', amount: -5040, type: 'expense', category: 'Genel Gider', accountId: 'acc1', invoiceId: 'inv6' },
  { id: 'tx7', date: '2026-05-22', description: 'Gida San kismi odeme', amount: 10000, type: 'income', category: 'Satis Geliri', accountId: 'acc1', invoiceId: 'inv3' },
]
