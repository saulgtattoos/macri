import { useState } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import InquiryAssistant from './pages/InquiryAssistant'
import CRM from './pages/CRM'
import DevQueue from './pages/DevQueue'
import SessionPrep from './pages/SessionPrep'
import Consultation from './pages/Consultation'
import ConsultationClient from './pages/ConsultationClient'
import ProjectWall from './pages/ProjectWall'
import Supplies from './pages/Supplies'
import ColorLab from './pages/ColorLab'

function AppShell() {
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [drawerClient,  setDrawerClient]  = useState(null)
  const [drawerSection, setDrawerSection] = useState(null)

  function openDrawer(client, section = null) {
    setDrawerClient(client)
    setDrawerSection(section)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setDrawerClient(null)
    setDrawerSection(null)
  }

  return (
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
      <main style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'scroll',
        background: 'var(--bg)',
      }}>
        <Outlet context={{ openDrawer, drawerOpen, drawerClient, drawerSection, closeDrawer }} />
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/consultation/client" element={<ConsultationClient />} />
        <Route element={<AppShell />}>
          <Route path="/"             element={<Home />} />
          <Route path="/inquiry"      element={<InquiryAssistant />} />
          <Route path="/crm"          element={<CRM />} />
          <Route path="/projects"     element={<ProjectWall />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/clients"      element={<Placeholder name="Client Database" />} />
          <Route path="/session-prep" element={<SessionPrep />} />
          <Route path="/finances"     element={<Placeholder name="Finances" />} />
          <Route path="/supplies"     element={<Supplies />} />
          <Route path="/colorlab"     element={<ColorLab />} />
          <Route path="/dev-queue"    element={<DevQueue />} />
          <Route path="/settings"     element={<Placeholder name="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}