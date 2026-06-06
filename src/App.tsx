import { useEffect } from 'react'
import { getSettings } from './lib/storage'
import Router from './router'

export default function App() {
  useEffect(() => {
    const { theme } = getSettings()
    document.documentElement.setAttribute('data-bs-theme', theme ?? 'dark')
  }, [])

  return <Router />
}
