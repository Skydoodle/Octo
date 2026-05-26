const kpis = [
  { label:'Nakit Pozisyonu', value:'₺402,000', sub:'4.2 aylık pist', color:'#4CAF84' },
  { label:'Uyumluluk Skoru', value:'76', sub:'KVKK eksik', color:'#E8A838' },
  { label:'Açık Faturalar', value:'₺184,500', sub:'3 gecikmiş', color:'#E24B4A' },
  { label:'Bu Ay Ciro', value:'₺2.85M', sub:'geçen aya +12%', color:'#4CAF84' },
]
export default function KPICards() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
      {kpis.map(kpi => (
        <div key={kpi.label} style={{ background:'#fff', border:'1px solid #E2DDD4', padding:'20px' }}>
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#8A8680', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'10px' }}>{kpi.label}</div>
          <div style={{ fontFamily:'monospace', fontSize:'22px', fontWeight:500, color:kpi.color, letterSpacing:'-0.02em', marginBottom:'4px' }}>{kpi.value}</div>
          <div style={{ fontSize:'12px', color:'#8A8680' }}>{kpi.sub}</div>
        </div>
      ))}
    </div>
  )
}
