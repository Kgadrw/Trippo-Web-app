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
          if (!id.includes("node_modules")) return;

          // Only split large libraries that do not depend on React.
          // Other packages (Radix, next-themes, recharts, etc.) must stay with React
          // in one chunk — splitting them caused "useLayoutEffect of undefined" at runtime.
          if (id.includes("html2canvas")) {
            return "vendor-html2canvas";
          }
          if (
            id.includes("/xlsx/") ||
            id.includes("/codepage/") ||
            id.includes("/cfb/")
          ) {
            return "vendor-xlsx";
          }
          if (id.includes("jspdf") || id.includes("html2pdf")) {
            return "vendor-pdf";
          }

          return "vendor";
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
