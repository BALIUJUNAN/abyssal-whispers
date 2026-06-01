import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'assets',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist-vite',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'dev.html'),
      },
      output: {
        // Single chunk for easy debugging
        manualChunks: undefined,
      },
    },
    // Inline small assets
    assetsInlineLimit: 0,
    // Single file output
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@reducers': resolve(__dirname, 'src/reducers'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@data': resolve(__dirname, 'src/data'),
      '@managers': resolve(__dirname, 'src/managers'),
      '@state': resolve(__dirname, 'src/state'),
    },
  },
  define: {
    // Provide GD as a global for gradual migration
    __GAME_DATA__: 'window.__GAME_DATA__ || {}',
  },
});
