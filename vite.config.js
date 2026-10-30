import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sonopolis is fully self-contained: no tile server, no CDN, no sample files.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    cors: true,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
