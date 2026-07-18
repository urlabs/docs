import { defineConfig } from 'vite'

// GitHub Pages project site is served from https://<user>.github.io/<repo>/
// This repo is "docs" under the "urlabs" account, so the base path is "/docs/".
// If you rename the repo, update this single value (and nothing else).
export default defineConfig({
  base: '/docs/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true,
    open: '/docs/',
  },
})
