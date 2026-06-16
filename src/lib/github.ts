const REPO = 'Nauja/nihongo-story'

export const RELEASES_URL = `https://github.com/${REPO}/releases`

export interface GitHubRelease {
  id: number
  name: string | null
  tag_name: string
  published_at: string | null
  html_url: string
  body: string | null
  prerelease: boolean
}

// Fetched statically at build time by the `static-releases` Vite plugin.
export { default as releases } from 'virtual:releases'
