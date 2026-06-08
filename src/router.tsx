import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Library from './pages/Library'
import Generate from './pages/Generate'
import StoryView from './pages/StoryView'
import Settings from './pages/Settings'

function GTMPageTracker() {
  const location = useLocation()

  useEffect(() => {
    const dl = (window as any).dataLayer
    if (!dl) return
    dl.push({
      event: 'page_view',
      page_path: location.pathname,
      page_title: document.title,
    })
  }, [location.pathname])

  return null
}

export default function Router() {
  return (
    <HashRouter>
      <GTMPageTracker />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Library />} />
          <Route path="generate" element={<Generate />} />
          <Route path="story/:id" element={<StoryView />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
