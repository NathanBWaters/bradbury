import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 12000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('poemsAndEssays.json')) {
            return 'catalog-poems-essays';
          }
          if (id.includes('storiesAndPlaces.json')) {
            return 'catalog-stories-places';
          }
        }
      }
    }
  }
});
