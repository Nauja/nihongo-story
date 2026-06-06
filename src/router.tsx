import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Library from './pages/Library'
import Generate from './pages/Generate'
import StoryView from './pages/StoryView'
import Settings from './pages/Settings'

export default function Router() {
  return (
    <HashRouter>
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
