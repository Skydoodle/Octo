import { useState } from 'react'
import Overview from './components/Overview'
import Invoices from './components/Invoices'
import Expenses from './components/Expenses'
import CashFlow from './components/CashFlow'

const tabs = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'invoices', label: 'Faturalar' },
  { id: 'expenses', label: 'Giderler' },
  { id: 'cashflow', label: 'Nakit Akışı' },
]

export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#C34B4B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Katman — 01
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          Finans
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #E2DDD4', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #C34B4B' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 500 : 400,
              color: activeTab === tab.id ? '#C34B4B' : '#8A8680',
              transition: 'all 0.15s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <Overview />}
      {activeTab === 'invoices' && <Invoices />}
      {activeTab === 'expenses' && <Expenses />}
      {activeTab === 'cashflow' && <CashFlow />}
    </div>
  )
}