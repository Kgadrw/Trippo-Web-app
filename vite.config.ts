import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/// <reference types="vitest" />

// https://vitejs.dev/config/
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
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    esbuildOptions: {
      jsx: "automatic",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
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
