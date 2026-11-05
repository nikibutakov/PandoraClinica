import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Внешний сайт клиники + табло (/board). Прокси /api уводит на бэкенд.
// preview (демо-запуск scripts/demo.py) сидит на том же порту, что и dev.
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 5174,
    strictPort: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
