import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy: any request to /upload, /query, /health gets forwarded
    // to the FastAPI backend at localhost:8000.
    // This means frontend code can just use "/upload" without thinking about ports.
    proxy: {
      "/upload": "http://localhost:8000",
      "/query": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
