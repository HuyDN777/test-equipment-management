import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ConfigProvider } from 'antd'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{ token: {
      colorPrimary: '#059669', colorInfo: '#059669', colorSuccess: '#10b981',
      colorLink: '#047857', borderRadius: 12, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      controlHeight: 42,
    } }}>
      <AuthProvider><App /></AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
