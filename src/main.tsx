import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Geist(variable) — 시간 / 숫자 / index UI 전용 서체. runtime CDN이 아니라 build에 포함된다.
import '@fontsource-variable/geist'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
