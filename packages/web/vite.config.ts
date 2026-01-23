import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

function resolveBackendTarget(): string {
  const explicit =
    process.env.VITE_API_URL || process.env.OPENSPEC_SERVER_URL || process.env.API_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const port = process.env.OPENSPEC_SERVER_PORT || process.env.SERVER_PORT || process.env.PORT
  const targetPort = port ? Number(port) : 3100
  return `http://localhost:${targetPort}`
}

export default defineConfig(() => {
  const backendTarget = resolveBackendTarget()
  console.log(`[dev-proxy] backend target => ${backendTarget}`)

  // Support base path configuration via env var (for static export)
  const basePath = process.env.VITE_BASE_PATH || '/'
  if (basePath !== '/') {
    console.log(`[vite-config] base path => ${basePath}`)
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@openspecui/core': resolve(__dirname, '../core/src'),
        '@openspecui/server': resolve(__dirname, '../server/src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/trpc': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
