/// <reference types="vite/client" />

declare module 'virtual:releases' {
  import type { GitHubRelease } from './lib/github'
  const releases: GitHubRelease[]
  export default releases
}
