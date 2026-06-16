import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/// <reference types="vitest" />

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.VITE_LOCAL_API_PORT || "3000"}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.VITE_LOCAL_API_PORT || "3000"}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react({ jsxRuntime: "automatic" }), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    esbuildOptions: { jsx: "automatic" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'vendor-router';
          }
          if (id.includes('html2canvas')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('@tanstack')) {
            return 'vendor-tanstack';
          }
          if (id.includes('date-fns')) {
            return 'vendor-datefns';
          }
          if (id.includes('jspdf') || id.includes('html2pdf')) {
            return 'vendor-pdf';
          }
          if (id.includes('/xlsx/') || id.includes('/codepage/') || id.includes('/cfb/')) {
            return 'vendor-xlsx';
          }
          if (id.includes('/zod/')) {
            return 'vendor-zod';
          }
          if (id.includes('/lodash/')) {
            return 'vendor-lodash';
          }
          if (id.includes('dompurify') || id.includes('embla-carousel')) {
            return 'vendor-ui-misc';
          }
          return 'vendor-misc';
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  publicDir: "public",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
