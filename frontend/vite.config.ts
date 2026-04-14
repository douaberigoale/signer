import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When running inside Docker, the backend service is reachable as "backend".
// For local development outside Docker, use localhost:8000.
const backendHost = process.env.BACKEND_HOST ?? "localhost";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: `http://${backendHost}:8000`,
        changeOrigin: true,
      },
    },
  },
});
