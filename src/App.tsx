import { Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"
import Layout from "./surfaces/dashboard/Layout"
import Dashboard from "./surfaces/dashboard/Dashboard"
import Finance from "./layers/finance/Finance"
import Vergi from './layers/tax/Vergi'

function Placeholder({ name }: { name: string }) {
  return (
    <div className="p-10">
      <div className="label text-crimson mb-3">{name} Katmani</div>
      <div className="font-mono text-4xl text-line mb-4">Yapım aşamasında</div>
      <div className="text-sm text-ink-soft">Bu katman yakında burada olacak.</div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="finans" element={<Finance />} />
        <Route path="vergi" element={<Vergi />} />
        <Route path="hukuk" element={<Placeholder name="Hukuk" />} />
        <Route path="ik" element={<Placeholder name="IK" />} />
        <Route path="operasyon" element={<Placeholder name="Operasyon" />} />
        <Route path="voice" element={<Placeholder name="Octo Voice" />} />
        <Route path="denetim" element={<Placeholder name="Denetim" />} />
      </Route>
    </Routes>
  )
}
