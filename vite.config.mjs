import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

export default defineConfig({
  root: './',
  base: './',
  plugins: [react()],
  envPrefix: ["VITE_", "TAURI_"],
  resolve: {
    alias: {
      '@tauri-apps/api': path.resolve(__dirname, './src/tauri-api-mock.js'),
    },
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    target: 'es2020',
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    host: true,
    strictPort: true,
    port: 5173,
  },
});
