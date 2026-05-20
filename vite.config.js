import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,  // fail fast if 5173 is taken instead of silently moving to 5174/5175
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED') {
              // Backend not yet up — return a clean 503 instead of crashing
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Backend indisponible' }))
              }
            }
          })
        },
      },
    },
  },
})
