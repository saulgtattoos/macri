import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1e1e1b',
          color: '#e8e6df',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          border: '1px solid #2a2a27',
          borderRadius: '10px',
          padding: '10px 18px',
        },
        success: {
          iconTheme: { primary: '#7aab8f', secondary: '#0e0e0d' },
          style: {
            background: '#1e1e1b',
            color: '#7aab8f',
            border: '1px solid rgba(122,171,143,0.3)',
          },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#0e0e0d' },
          style: {
            background: '#1e1e1b',
            color: '#f09595',
            border: '1px solid rgba(239,68,68,0.3)',
          },
        },
      }}
    />
  </StrictMode>,
)
