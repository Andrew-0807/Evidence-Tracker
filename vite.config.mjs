import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: './',
  base: './',
  plugins: [react()],
  envPrefix: ["VITE_", "TAURI_"],
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
