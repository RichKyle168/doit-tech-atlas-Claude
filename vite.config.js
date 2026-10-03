import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build           → dist/            the client served by the API server (data comes from /api)
// npm run build:artifact  → dist-artifact/   one self-contained HTML file with the content bundled in
export default defineConfig(({ mode }) => (mode === 'artifact'
  ? {
    plugins: [react(), viteSingleFile()],
    build: { outDir: 'dist-artifact', target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 100000000 },
  }
  : {
    plugins: [react()],
    build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 1200 },
    // only scan the real entry (not build output) and don't reload when the local database writes files
    optimizeDeps: { entries: ['index.html'] },
    server: { watch: { ignored: ['**/.data/**', '**/dist-artifact/**'] } },
  }));
