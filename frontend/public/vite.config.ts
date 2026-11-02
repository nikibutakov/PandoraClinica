import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Внешний сайт клиники + табло (/board). Прокси /api уводит на бэкенд.
export default defineConfig({
  plugins: [react()],
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
