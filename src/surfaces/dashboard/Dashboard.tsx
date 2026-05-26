import Briefing from './components/Briefing'
import KPICards from './components/KPICards'
import IntelligenceFeed from './components/IntelligenceFeed'
import Horizon from './components/Horizon'

function Sidebar() {
  const items = [
    { label: 'Dashboard', active: true },
    { label: 'Finans', active: false },
    { label: 'Vergi', active: false },
    { label: 'Hukuk', active: false },
    { label: 'İnsan Kaynakları', active: false },
    { label: 'Operasyon', active: false },
    { label: 'Octo Voice', active: false },
  ]
  return (
    <aside style={{ background:'#1A1A1A', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'28px 24px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'24px', color:'#C34B4B', fontWeight:600 }}>Octo</div>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'monospace' }}>Şirketinizin Beyni</div>
      </div>
      <nav style={{ padding:'16px 12px', flex:1 }}>
        {items.map(item => (
          <div key={item.label} style={{ padding:'10px 12px', marginBottom:'2px', borderRadius:'6px', fontSize:'13px', fontWeight: item.active ? 500 : 400, color: item.active ? '#fff' : 'rgba(255,255,255,0.4)', background: item.active ? 'rgba(195,75,75,0.15)' : 'transparent', borderLeft: item.active ? '2px solid #C34B4B' : '2px solid transparent', cursor:'pointer' }}>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding:'20px 24px', borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:'11px', color:'rgba(255,255,255,0.2)', fontFamily:'monospace' }}>v0.1.0 — alpha</div>
    </aside>
  )
}

export default function Dashboard() {
  return (
    <div style={{ minHeight:'100vh', background:'#F7F4EE', display:'grid', gridTemplateColumns:'220px 1fr' }}>
      <Sidebar />
      <main style={{ padding:'32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <Briefing />
        <KPICards />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'20px' }}>
          <IntelligenceFeed />
          <Horizon />
        </div>
      </main>
    </div>
  )
}
