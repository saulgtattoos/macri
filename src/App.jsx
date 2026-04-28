import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Placeholder from './pages/Placeholder'
import InquiryAssistant from './pages/InquiryAssistant'
import CRM from './pages/CRM'
import DevQueue from './pages/DevQueue'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-outer" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />

        <div className="mobile-header" style={{ flexDirection: 'column', gap: '3px' }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--gold)',
            lineHeight: 1,
          }}>
            MACRI
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: '#7a786f',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            Managing. Artist. Clients. Revenue. Intelligently.
          </span>
        </div>

        {/* overflowY:'scroll' instead of 'auto' — iOS Safari applies implicit momentum-scroll
            context to overflow:auto which can cancel touch events before they reach children */}
        <main style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',
          background: 'var(--bg)',
        }}>
          <Routes>
            <Route path="/"             element={<Placeholder name="Home" />} />
            <Route path="/inquiry"      element={<InquiryAssistant />} />
            <Route path="/crm"          element={<CRM />} />
            <Route path="/projects"     element={<Placeholder name="Project Wall" />} />
            <Route path="/consultation" element={<Placeholder name="Consultation" />} />
            <Route path="/clients"      element={<Placeholder name="Client Database" />} />
            <Route path="/session-prep" element={<Placeholder name="Session Prep" />} />
            <Route path="/finances"     element={<Placeholder name="Finances" />} />
            <Route path="/dev-queue"    element={<DevQueue />} />
            <Route path="/settings"     element={<Placeholder name="Settings" />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
