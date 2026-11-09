# Бэкенд: один Dockerfile с двумя targets — dev и prod.
# dev:  docker build --target dev -t pandora-backend:dev ./backend
# prod: docker build --target prod -t pandora-backend:prod ./backend

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# ── dev: инструменты разработки, код монтируется volume-ом, uvicorn с reload ──
FROM base AS dev
COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt
# alembic.ini нужен dev-контейнеру, чтобы применять миграции на старте
# (сами миграции приходят volume-ом из репозитория)
COPY alembic.ini ./
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

# ── prod: только рантайм, код зашит в образ, непривилегированный пользователь ──
FROM base AS prod
COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app
RUN useradd --system --no-create-home pandora \
    && chown -R pandora: /app
USER pandora
EXPOSE 8000
# Миграции применяются перед стартом; DATABASE_URL берётся из окружения
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
