import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React libraries — cached across all page navigations
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
              return 'vendor-react'
            }
            // Framer Motion — heavy animation library
            if (id.includes('/framer-motion/')) {
              return 'vendor-motion'
            }
            // Supabase client — only needed for authenticated routes
            if (id.includes('/@supabase/')) {
              return 'vendor-supabase'
            }
            // Everything else in node_modules
            return 'vendor'
          }
        },
      },
    },
  },
})
