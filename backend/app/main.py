"""Точка входа FastAPI. Запуск: uvicorn app.main:app --reload"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth

app = FastAPI(
    title="Pandora Clinica API",
    version="0.1.0",
    description="Бекенд поликлиники: администратор, регистратура, врачи.",
)

# Пока фронтов нет — разрешаем всё; сузим при подключении приложений
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["Служебные"])
def healthz() -> dict:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["Аутентификация"])
