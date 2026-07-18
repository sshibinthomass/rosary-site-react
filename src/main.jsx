import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { isNativeAppRuntime } from './utils/nativeAppSupport.js'

import { HelmetProvider } from 'react-helmet-async'

const enableVercelInsights = !isNativeAppRuntime(Capacitor)

registerSW({ immediate: true })

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
