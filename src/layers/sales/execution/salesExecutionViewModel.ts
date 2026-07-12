import type { SalesActivity, SalesActivityType, SalesLead, SalesLeadStatus, SalesOpportunity, SalesPipelineStage } from './types'
export const leadStatusLabels:Record<SalesLeadStatus,string>={new:'Yeni',to_contact:'İletişime geçilecek',contacted:'İletişime geçildi',qualifying:'Nitelendiriliyor',qualified:'Uygun',disqualified:'Uygun değil',converted:'Dönüştürüldü'}
export const activityLabels:Record<SalesActivityType,string>={call:'Arama',meeting:'Toplantı',email:'E-posta',message:'Mesaj',note:'Not',task:'Görev',quote_sent:'Teklif gönderildi',file_shared:'Dosya paylaşıldı',stage_changed:'Aşama değişti',sales_order_event:'Satış siparişi',invoice_event:'Fatura',payment_event:'Ödeme'}
export const leadDisplayName=(lead:SalesLead)=>lead.companyName||[lead.firstName,lead.lastName].filter(Boolean).join(' ')||'Adsız kayıt'
export const opportunityNeedsNextAction=(opportunity:SalesOpportunity,stage:SalesPipelineStage)=>!stage.isClosed&&(!opportunity.nextAction||!opportunity.nextActionAt)
export const opportunityIsStale=(stageEnteredAt:string,stage:SalesPipelineStage,now=new Date())=>!stage.isClosed&&stage.staleAfterDays!=null&&(now.getTime()-new Date(stageEnteredAt).getTime())/86400000>stage.staleAfterDays
export const opportunityIsOverdue=(opportunity:SalesOpportunity,stage:SalesPipelineStage,today=new Date())=>!stage.isClosed&&!!opportunity.expectedCloseDate&&new Date(`${opportunity.expectedCloseDate}T23:59:59`).getTime()<today.getTime()
export const taskIsOverdue=(activity:SalesActivity,now=new Date())=>activity.activityType==='task'&&!activity.completedAt&&!!activity.dueAt&&new Date(activity.dueAt)<now
export const taskIsDueToday=(activity:SalesActivity,now=new Date())=>activity.activityType==='task'&&!activity.completedAt&&!!activity.dueAt&&new Date(activity.dueAt).toDateString()===now.toDateString()
export const stageProbability=(opportunity:SalesOpportunity,stage:SalesPipelineStage)=>opportunity.probability??stage.defaultProbability
export const weightedOpportunityValue=(opportunity:SalesOpportunity,stage:SalesPipelineStage)=>opportunity.expectedValue*stageProbability(opportunity,stage)/100
export const opportunityState=(stage:SalesPipelineStage)=>stage.outcome??(stage.isClosed?'closed':'open')
