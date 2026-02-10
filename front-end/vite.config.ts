import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.corg1.uk',
        changeOrigin: true,
        secure: false,
        // ssl: {
        //   key: fs.readFileSync(path.resolve(__dirname, '../back-end/api/certs/localhost-key.pem')),
        //   cert: fs.readFileSync(path.resolve(__dirname, '../back-end/api/certs/localhost.pem')),
        // },
      },
    },
  },
  build: {
    // Minify output
    minify: 'terser',
    // CSS code splitting (default true, but good to be explicit)
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Create a specific vendor chunk for node_modules
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'leaflet', 'react-leaflet'],
        },
      },
    },
    // Raise warning limit to avoids noise for slightly larger chunks
    chunkSizeWarningLimit: 1000,
  },
})
