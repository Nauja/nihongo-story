import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Fetches the GitHub release list once at build (and dev server) start and exposes
// it as the `virtual:releases` module, so the "What's New" page needs no runtime call.
function staticReleases(): Plugin {
  const virtualId = 'virtual:releases'
  const resolvedId = '\0' + virtualId
  let cache: string | null = null

  async function fetchReleases(): Promise<string> {
    try {
      const res = await fetch(
        'https://api.github.com/repos/Nauja/nihongo-story/releases',
        { headers: { Accept: 'application/vnd.github+json' } },
      )
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
      const data = (await res.json()) as Array<Record<string, unknown>>
      // GitHub returns releases newest-first; drop unpublished drafts.
      const releases = data
        .filter((r) => !r.draft)
        .map((r) => ({
          id: r.id,
          name: r.name,
          tag_name: r.tag_name,
          published_at: r.published_at,
          html_url: r.html_url,
          body: r.body,
          prerelease: r.prerelease,
        }))
      return JSON.stringify(releases)
    } catch (err) {
      console.warn('[static-releases] failed to fetch releases at build time:', err)
      return '[]'
    }
  }

  return {
    name: 'static-releases',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    async load(id) {
      if (id === resolvedId) {
        if (cache === null) cache = await fetchReleases()
        return `export default ${cache}`
      }
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['react-bootstrap'],
        },
      },
    },
  },
  plugins: [
    staticReleases(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '日本語ストーリー',
        short_name: 'Nihongo Story',
        description: 'Generate and read Japanese learning stories powered by Claude AI',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
