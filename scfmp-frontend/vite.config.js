import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // jsPDF exposes optional SVG/HTML helpers. SCFMP only uses its table/text API,
      // so keep those large browser-only adapters out of the main application bundle.
      external: ['canvg', 'html2canvas', 'dompurify'],
    },
  },
  server: {
    port: 5173,
  },
});
