import { Routes, Route } from 'react-router-dom'
import Layout from './surfaces/dashboard/Layout'
import Dashboard from './surfaces/dashboard/Dashboard'

function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '40px' }}>
      <div style={{ fontFamily:'monospace', fontSize:'11px', color:'#C34B4B', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'12px' }}>{name} Katmanı</div>
      <div style={{ fontFamily:'monospace', fontSize:'32px', color:'#E2DDD4', marginBottom:'16px' }}>Yapım aşamasında</div>
      <div style={{ fontSize:'14px', color:'#8A8680' }}>Bu katman yakında burada olacak.</div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="finans" element={<Placeholder name="Finans" />} />
        <Route path="vergi" element={<Placeholder name="Vergi" />} />
        <Route path="hukuk" element={<Placeholder name="Hukuk" />} />
        <Route path="ik" element={<Placeholder name="İnsan Kaynakları" />} />
        <Route path="operasyon" element={<Placeholder name="Operasyon" />} />
        <Route path="voice" element={<Placeholder name="Octo Voice" />} />
      </Route>
    </Routes>
  )
}
