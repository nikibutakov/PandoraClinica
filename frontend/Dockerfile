# Фронтенд: один Dockerfile с двумя targets — dev и prod.
# В проекте два приложения-воркспейса: staff (5173) и public (5174).
#
# dev:  docker build --target dev -t pandora-frontend:dev ./frontend
#       (контейнер поднимает оба dev-сервера vite, код монтируется volume-ом)
# prod: docker build --target prod -t pandora-frontend:prod ./frontend
#       (build-stage собирает оба dist, nginx отдаёт их на 80 и 81)

FROM node:22-alpine AS dev
WORKDIR /app
# Зависимости ставим на этапе сборки; node_modules не затирается монтированием
# благодаря анонимному volume в compose (volumes: - /app/node_modules)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY staff/package.json ./staff/
COPY public/package.json ./public/
RUN npm ci
EXPOSE 5173 5174
# Оба dev-сервера с флагом --host, иначе vite слушает только localhost в контейнере
CMD ["sh", "-c", "npm run dev -w @pandora/staff -- --host 0.0.0.0 & npm run dev -w @pandora/public -- --host 0.0.0.0 & wait"]

# ── builder: полная сборка обоих приложений (включая tsc --noEmit) ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY staff/package.json ./staff/
COPY public/package.json ./public/
RUN npm ci
COPY shared ./shared
COPY staff ./staff
COPY public ./public
RUN npm run build

# ── prod: nginx отдаёт собранную статику и проксирует /api на бэкенд ──
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/staff/dist /usr/share/nginx/staff
COPY --from=builder /app/public/dist /usr/share/nginx/public
EXPOSE 80 81
