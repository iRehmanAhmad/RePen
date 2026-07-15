/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const rendererRoot = path.resolve(__dirname, 'src/renderer');
const rendererOut = path.resolve(__dirname, 'dist-renderer');

function copyLegacyRendererAssets() {
  const files = ['overlay.js', 'toolbar.js', 'settings.js', 'selector.js', 'countdown.js'];

  return {
    name: 'copy-legacy-renderer-assets',
    closeBundle() {
      fs.mkdirSync(rendererOut, { recursive: true });
      for (const file of files) {
        fs.copyFileSync(path.join(rendererRoot, file), path.join(rendererOut, file));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyLegacyRendererAssets()],
  root: rendererRoot,
  base: './',
  build: {
    outDir: rendererOut,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        overlay: path.resolve(__dirname, 'src/renderer/overlay.html'),
        toolbar: path.resolve(__dirname, 'src/renderer/toolbar.html'),
        settings: path.resolve(__dirname, 'src/renderer/settings.html'),
        selector: path.resolve(__dirname, 'src/renderer/selector.html'),
        countdown: path.resolve(__dirname, 'src/renderer/countdown.html'),
        editor: path.resolve(__dirname, 'src/renderer/editor.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    root: path.resolve(__dirname)
  }
});
