import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Copy icons folder
        const iconsDir = resolve(__dirname, 'icons');
        const distIconsDir = resolve(__dirname, 'dist/icons');

        if (existsSync(iconsDir)) {
          if (!existsSync(distIconsDir)) {
            mkdirSync(distIconsDir, { recursive: true });
          }

          // Copy all PNG icons
          const iconFiles = readdirSync(iconsDir).filter((f: string) => f.endsWith('.png'));

          iconFiles.forEach((file: string) => {
            copyFileSync(
              resolve(iconsDir, file),
              resolve(distIconsDir, file)
            );
          });

          console.log('✓ Copied manifest.json and icons to dist/');
        } else {
          console.log('✓ Copied manifest.json to dist/');
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        settings: resolve(__dirname, 'settings.html'),
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Content and background scripts should be standalone
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Don't minify to avoid single-line issues with Chrome
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
