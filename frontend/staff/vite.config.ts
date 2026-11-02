import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Внутреннее приложение персонала. Прокси /api уводит на бэкенд — CORS не участвует.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
