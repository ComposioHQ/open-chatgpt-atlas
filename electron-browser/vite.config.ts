import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process
        entry: 'src/main/index.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'electron-store', '@ai-sdk/mcp'],
              output: {
                format: 'cjs',
              },
            },
            target: 'node18',
          },
          ssr: {
            external: ['electron', 'electron-store', '@ai-sdk/mcp'],
          },
        },
      },
      {
        // Preload script
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist/preload',
          },
        },
      },
    ]),
    renderer(),
  ],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@composio/core', '@composio/vercel', 'electron'],
    include: [],
  },
  define: {
    'global': 'globalThis',
  },
  server: {
    port: 5173,
  },
});
