import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Внешний сайт клиники + табло (/board). Прокси /api уводит на бэкенд.
// preview (демо-запуск scripts/demo.py) сидит на том же порту, что и dev.
export default defineConfig(({ mode }) => {
  // В docker-compose dev-окружения бэкенд — сервис backend, не localhost;
  // PROXY_TARGET читается из окружения (loadEnv с пустым префиксом)
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    preview: {
      port: 5174,
      strictPort: true,
    },
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target: env.PROXY_TARGET ?? "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
