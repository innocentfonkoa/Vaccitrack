import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VacciTrack',
        short_name: 'VacciTrack',
        description: 'Vaccination tally sheet capture and reporting',
        theme_color: '#0F6E56',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Cache app shell so the location dropdowns and capture screen
        // still work offline; submissions queue locally and sync when
        // connectivity returns (see src/utils/syncQueue.ts)
        globPatterns: ['**/*.{js,css,html,json}']
      }
    })
  ]
})
