import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: './',
  base: './',
  plugins: [
    react(),

  ],
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    assetsInlineLimit: 0,
    cssCodeSplit: false,

    // **CONDITIONAL TARGET PROPERTY (KEY CHANGE)**
    target: 'es2021',

    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  server: {
    host: true,
    strictPort: true,
    port: 5173,
    middleware: [
      (req, res, next) => {
        if (req.url.startsWith("/src")) {
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
          );
          next();
        } else {
          next();
        }
      },
    ],
  },
});
