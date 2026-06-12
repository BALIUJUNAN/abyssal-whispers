import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { renameSync, existsSync } from 'fs';

// Dev-only plugin: redirect / to /dev.html so Vite processes dev.html
// (with @vitejs/plugin-react preamble injection) instead of root index.html
// (the 1.8MB legacy build output).
function devHtmlPlugin() {
  return {
    name: 'dev-html',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Rewrite root requests to dev.html so Vite's HTML transform
        // pipeline (including @vitejs/plugin-react preamble) runs on it.
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/dev.html';
        }
        next();
      });
    },
  };
}

// Build-only plugin: rename dev.html → index.html in output so preview
// server can serve it at / without configuration.
function renameOutputPlugin() {
  return {
    name: 'rename-output',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist-vite');
      const src = resolve(outDir, 'dev.html');
      const dst = resolve(outDir, 'index.html');
      if (existsSync(src)) {
        renameSync(src, dst);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), devHtmlPlugin(), renameOutputPlugin()],
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
      '@engine': resolve(__dirname, 'src/engine'),
    },
  },
  define: {
    // Provide GD as a global for gradual migration
    __GAME_DATA__: 'window.__GAME_DATA__ || {}',
  },
});
