const events = [
  { date:'26 May', label:'KDV Beyannamesi', type:'critical' },
  { date:'26 May', label:'Muhtasar Beyanı', type:'critical' },
  { date:'30 May', label:'SGK Prim Ödemesi', type:'critical' },
  { date:'01 Haz', label:'Tedarikçi sözleşme yenileme', type:'warning' },
  { date:'10 Haz', label:'Kira ödemesi', type:'info' },
  { date:'15 Haz', label:'Ofis kira yenileme', type:'warning' },
  { date:'26 Haz', label:'KDV Beyannamesi', type:'info' },
  { date:'30 Haz', label:'SGK Prim Ödemesi', type:'info' },
]
const clr: Record<string,string> = { critical:'#E24B4A', warning:'#E8A838', info:'#4CAF84' }
export default function Horizon() {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2DDD4' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #E2DDD4' }}>
        <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#8A8680', letterSpacing:'0.1em', textTransform:'uppercase' }}>30 Günlük Ufuk</div>
      </div>
      {events.map((e,i) => (
        <div key={i} style={{ padding:'12px 20px', borderBottom: i<events.length-1?'1px solid #E2DDD4':'none', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#8A8680', minWidth:'48px', flexShrink:0 }}>{e.date}</div>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:clr[e.type], flexShrink:0 }} />
          <div style={{ fontSize:'12px', color:'#1A1A1A' }}>{e.label}</div>
        </div>
      ))}
    </div>
  )
}
