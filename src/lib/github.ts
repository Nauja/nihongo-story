const REPO = 'Nauja/nihongo-story'
const BASE_URL = `https://api.github.com/repos/${REPO}`

export const RELEASES_URL = `https://github.com/${REPO}/releases`

export interface GitHubRelease {
  id: number
  name: string | null
  tag_name: string
  published_at: string | null
  html_url: string
  body: string | null
  prerelease: boolean
  draft: boolean
}

const CACHE_KEY = 'nihongo-github-releases'

function getCachedReleases(): GitHubRelease[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as GitHubRelease[]) : null
  } catch {
    return null
  }
}

function setCachedReleases(releases: GitHubRelease[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(releases))
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

export async function getReleases(): Promise<GitHubRelease[]> {
  const cached = getCachedReleases()
  if (cached) return cached

  const res = await fetch(`${BASE_URL}/releases`, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data = (await res.json()) as GitHubRelease[]
  // GitHub returns releases newest-first; drop unpublished drafts.
  const releases = data.filter((r) => !r.draft)
  setCachedReleases(releases)
  return releases
}
