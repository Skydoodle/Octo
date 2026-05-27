import Briefing from './components/Briefing'
import KPICards from './components/KPICards'
import IntelligenceFeed from './components/IntelligenceFeed'
import Horizon from './components/Horizon'

export default function Dashboard() {
  return (
    <>
      <Briefing />
      <KPICards />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'20px' }}>
        <IntelligenceFeed />
        <Horizon />
      </div>
    </>
  )
}
