import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Placeholder from './pages/Placeholder'
import InquiryAssistant from './pages/InquiryAssistant'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg)',
          height: '100vh',
        }}>
          <Routes>
            <Route path="/"             element={<Placeholder name="Home" />} />
            <Route path="/inquiry"      element={<InquiryAssistant />} />
            <Route path="/crm"          element={<Placeholder name="CRM" />} />
            <Route path="/projects"     element={<Placeholder name="Project Wall" />} />
            <Route path="/consultation" element={<Placeholder name="Consultation" />} />
            <Route path="/clients"      element={<Placeholder name="Client Database" />} />
            <Route path="/session-prep" element={<Placeholder name="Session Prep" />} />
            <Route path="/finances"     element={<Placeholder name="Finances" />} />
            <Route path="/settings"     element={<Placeholder name="Settings" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
