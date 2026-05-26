const alerts = [
  { severity:'critical', layer:'VERGİ', message:'KDV beyannamesi onay bekliyor', impact:'₺228,300', deadline:'2 gün', action:'Müşavirinize gönderin' },
  { severity:'critical', layer:'İK', message:'SGK prim ödemesi yaklaşıyor', impact:'₺142,800', deadline:'4 gün', action:'Ödemeyi planlayın' },
  { severity:'warning', layer:'DENETİM', message:'SGK + KDV aynı haftaya denk geliyor — nakit riski', impact:'₺371,100', deadline:'4 gün', action:'Nakit akışını gözden geçirin' },
  { severity:'warning', layer:'HUKUK', message:'Tedarikçi sözleşmesi yenileme tarihi yaklaşıyor', impact:'₺540,000/yıl', deadline:'18 gün', action:'Sözleşmeyi inceleyin' },
  { severity:'info', layer:'FİNANS', message:'Müşteri A — 45 günlük gecikmiş fatura', impact:'₺84,500', deadline:'45 gün gecikmeli', action:'Tahsilat başlatın' },
]
const clr: Record<string,string> = { critical:'#E24B4A', warning:'#E8A838', info:'#4CAF84' }
export default function IntelligenceFeed() {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2DDD4' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #E2DDD4', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#8A8680', letterSpacing:'0.1em', textTransform:'uppercase' }}>Zeka Akışı — Finansal Etkiye Göre</div>
        <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#C34B4B' }}>{alerts.length} aktif</div>
      </div>
      {alerts.map((a,i) => (
        <div key={i} style={{ padding:'16px 20px', borderBottom: i<alerts.length-1?'1px solid #E2DDD4':'none', display:'flex', gap:'14px', alignItems:'flex-start' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:clr[a.severity], marginTop:'6px', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <span style={{ fontFamily:'monospace', fontSize:'9px', color:'#8A8680', letterSpacing:'0.08em' }}>{a.layer}</span>
              <span style={{ fontSize:'13px', color:'#1A1A1A' }}>{a.message}</span>
            </div>
            <div style={{ fontSize:'12px', color:'#8A8680' }}>{a.action}</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'monospace', fontSize:'12px', color:clr[a.severity], fontWeight:500, marginBottom:'2px' }}>{a.impact}</div>
            <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#8A8680' }}>{a.deadline}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
