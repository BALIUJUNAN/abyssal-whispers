import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { renameSync, existsSync, cpSync, mkdirSync } from 'fs';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
        // Content editor route: localhost:3000/editor
        if (req.url === '/editor' || req.url === '/editor.html') {
          req.url = '/tools/editor.html';
        }
        next();
      });
    },
  };
}

// Build-only plugin: finalize output (rename HTML, copy audio).
function finalizeBuildPlugin() {
  return {
    name: 'finalize-build',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      // Rename dev.html → index.html
      const src = resolve(outDir, 'dev.html');
      const dst = resolve(outDir, 'index.html');
      if (existsSync(src)) {
        renameSync(src, dst);
      }
      // Copy audio directory (not in publicDir, needs explicit copy)
      const audioSrc = resolve(__dirname, 'audio');
      const audioDst = resolve(outDir, 'audio');
      if (existsSync(audioSrc)) {
        try {
          cpSync(audioSrc, audioDst, { recursive: true });
          console.log('[build] Copied audio/ to dist/audio/');
        } catch (e) {
          console.warn('[build] Audio copy failed:', e.message);
        }
      }
      // Copy game data JSON files (loaded at runtime via fetch)
      const dataSrc = resolve(__dirname, 'src/data');
      const dataFiles = ['game_base.json', 'game_ch2plus.json', 'game_meta.json'];
      for (const df of dataFiles) {
        const srcPath = resolve(dataSrc, df);
        const dstPath = resolve(outDir, df);
        if (existsSync(srcPath)) {
          try {
            cpSync(srcPath, dstPath);
            console.log('[build] Copied ' + df + ' to dist/');
          } catch (e) {
            console.warn('[build] ' + df + ' copy failed:', e.message);
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    devHtmlPlugin(),
    viteSingleFile({  // Build-only: merge all chunks into single HTML
      enable: false,  // Disabled during dev (HMR needs separate chunks)
    }),
    finalizeBuildPlugin(),
  ],
  base: './',
  root: '.',
  publicDir: 'assets',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'dev.html'),
      },
    },
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    sourcemap: false,
    // Vite auto-splits vendor chunks via rolldown optimization
    // No manualChunks needed — Rolldown handles React/Immer separation
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
