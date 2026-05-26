export default function Briefing() {
  return (
    <div style={{ background:'#1A1A1A', borderLeft:'3px solid #C34B4B', padding:'20px 24px' }}>
      <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#C34B4B', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'10px' }}>
        Günlük Brifing — 26 Mayıs 2026
      </div>
      <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.8)', lineHeight:'1.7', fontWeight:300 }}>
        Bu hafta <strong style={{ color:'#fff', fontWeight:500 }}>2 kritik ödemeniz</strong> var — Çarşamba KDV beyannamesi (₺228,300) ve Cuma SGK primi (₺142,800). Toplam nakit çıkışı ₺371,100. Hesabınızda ₺402,000 var — <strong style={{ color:'#fff', fontWeight:500 }}>dar ama yeterli.</strong>
      </div>
    </div>
  )
}
