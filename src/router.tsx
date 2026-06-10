import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import Layout from './components/Layout'

const Library = lazy(() => import('./pages/Library'))
const Generate = lazy(() => import('./pages/Generate'))
const StoryView = lazy(() => import('./pages/StoryView'))
const Settings = lazy(() => import('./pages/Settings'))

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
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Library />} />
            <Route path="generate" element={<Generate />} />
            <Route path="story/:id" element={<StoryView />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
