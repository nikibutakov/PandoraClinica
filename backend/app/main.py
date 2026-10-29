"""Точка входа FastAPI. Запуск: uvicorn app.main:app --reload"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.routers import admin, auth, board, doctor, public, registrar

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


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


app.include_router(auth.router, prefix="/api/auth", tags=["Аутентификация"])
app.include_router(public.router, prefix="/api/public", tags=["Внешний сайт"])
app.include_router(admin.router, prefix="/api/admin", tags=["Администратор"])
app.include_router(registrar.router, prefix="/api/registrar", tags=["Регистратура"])
app.include_router(doctor.router, prefix="/api/doctor", tags=["Врач"])
app.include_router(board.router, prefix="/api/board", tags=["Табло"])
