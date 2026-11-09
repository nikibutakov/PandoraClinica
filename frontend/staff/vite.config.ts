import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Внутреннее приложение персонала. Прокси /api уводит на бэкенд — CORS не участвует.
// preview (демо-запуск scripts/demo.py) сидит на том же порту, что и dev.
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 5173,
    strictPort: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // В docker-compose dev-окружения бэкенд — сервис backend, не localhost
        target: process.env.PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
