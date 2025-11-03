import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxy so the frontend (5173) can talk to the Node server (3000)
// - Proxies Socket.IO WebSocket traffic and REST API calls
// - Lets the client use same-origin URLs (no VITE_API_URL needed in dev)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
