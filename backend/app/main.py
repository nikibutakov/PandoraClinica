"""Точка входа FastAPI. Запуск: uvicorn app.main:app --reload"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.routers import admin, auth, board, doctor, public, registrar

TAGS = [
    {"name": "Аутентификация", "description": "Вход по логину и паролю; JWT-токен нужен всем закрытым блокам."},
    {"name": "Внешний сайт", "description": "Публичные эндпоинты без авторизации: график приёмов и заявки на перезвон."},
    {"name": "Табло", "description": "Публичное состояние очереди для телевизора в холле. Без авторизации."},
    {"name": "Регистратура · Утро и кабинеты", "description": "Утренний экран смены и закрепление врачей за кабинетами."},
    {"name": "Регистратура · Пациенты", "description": "Поиск и регистрация пациентов, в том числе без СНИЛС и иностранцев."},
    {"name": "Регистратура · Запись и талоны", "description": "Запись на свободные слоты (в т.ч. по направлению) и выдача талонов живой очереди."},
    {"name": "Регистратура · Направления и перезвоны", "description": "Работа с направлениями врачей и заявками на перезвон с внешнего сайта."},
    {"name": "Врач · Смена и очередь", "description": "Мой день, очередь талонов, вызов и пропуск пациента."},
    {"name": "Врач · Приём и направления", "description": "Запись приёма с диагнозами по МКБ-10 и направления к специальности."},
    {"name": "Админ · Персонал", "description": "Учётные записи регистраторов и администраторов."},
    {"name": "Админ · Справочники", "description": "Специальности и кабинеты."},
    {"name": "Админ · Врачи и график", "description": "Найм врачей (учётка + договор одной операцией) и недельные шаблоны графика."},
    {"name": "Админ · Слоты", "description": "Генерация слотов из шаблонов графика и контроль слотов за дату."},
    {"name": "Админ · Выгрузки", "description": "Вечерняя выгрузка приёмов за день раздельно по гражданству РФ / не-РФ."},
]

app = FastAPI(
    title="Pandora Clinica API",
    version="0.2.0",
    description=(
        "Бекенд поликлиники: регистратура, врачи, администратор, табло и внешний сайт.\n\n"
        "1. Войдите через «Аутентификация» и скопируйте `access_token`.\n"
        "2. Нажмите кнопку **Authorize** и вставьте токен — закрытые блоки станут доступны для тестирования.\n\n"
        "Публичные группы «Внешний сайт» и «Табло» работают без токена."
    ),
    openapi_tags=TAGS,
)

# Пока фронтов нет — разрешаем всё; сузим при подключении приложений
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["Служебные"], summary="Проверка живости")
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


app.include_router(auth.router, prefix="/api/auth")
app.include_router(public.router, prefix="/api/public")
app.include_router(board.router, prefix="/api/board")
app.include_router(registrar.router, prefix="/api/registrar")
app.include_router(doctor.router, prefix="/api/doctor")
app.include_router(admin.router, prefix="/api/admin")
