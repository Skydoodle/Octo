import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Finans', path: '/finans' },
  { label: 'Vergi', path: '/vergi' },
  { label: 'Hukuk', path: '/hukuk' },
  { label: 'İnsan Kaynakları', path: '/ik' },
  { label: 'Operasyon', path: '/operasyon' },
  { label: 'Octo Voice', path: '/voice' },
]

export default function Layout() {
  return (
    <div style={{ minHeight:'100vh', background:'#F7F4EE', display:'grid', gridTemplateColumns:'220px 1fr' }}>
      <aside style={{ background:'#1A1A1A', minHeight:'100vh', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh' }}>
        
        <div style={{ padding:'28px 24px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'24px', color:'#C34B4B', fontWeight:600 }}>Octo</div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'monospace' }}>Şirketinizin Beyni</div>
        </div>

        <nav style={{ padding:'16px 12px', flex:1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                marginBottom: '2px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                background: isActive ? 'rgba(195,75,75,0.15)' : 'transparent',
                borderLeft: isActive ? '2px solid #C34B4B' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'20px 24px', borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:'11px', color:'rgba(255,255,255,0.2)', fontFamily:'monospace' }}>
          v0.1.0 — alpha
        </div>
      </aside>

      <main style={{ padding:'32px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <Outlet />
      </main>
    </div>
  )
}
