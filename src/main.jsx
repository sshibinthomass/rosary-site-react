import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import { isNativeAppRuntime } from './utils/nativeAppSupport.js'

import { HelmetProvider } from 'react-helmet-async'

const enableVercelInsights = !isNativeAppRuntime(Capacitor)

if (!isNativeAppRuntime(Capacitor) && import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshingForNewRelease = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshingForNewRelease) return
    refreshingForNewRelease = true
    window.location.reload()
  })

  void navigator.serviceWorker
    .register(`/sw.js?update=${Date.now()}`)
    .catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
      {enableVercelInsights && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </HelmetProvider>
  </StrictMode>,
)
