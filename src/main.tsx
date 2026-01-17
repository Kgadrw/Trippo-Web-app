import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
import { initDB } from "./lib/indexedDB";

// Initialize IndexedDB and register service worker
Promise.all([
  initDB().catch((error) => {
    console.error("Failed to initialize IndexedDB:", error);
  }),
  registerServiceWorker().catch((error) => {
    console.error("Failed to register service worker:", error);
  }),
]).then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
