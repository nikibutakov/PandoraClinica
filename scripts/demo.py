"""Запуск демо-окружения одной командой: БД → миграции → демо-данные → бэкенд → фронты.

Использование (из корня репозитория):

    python scripts/demo.py            # обычный запуск (идемпотентен)
    python scripts/demo.py --fresh    # сброс базы и демо-данные заново

Что делает:
  1. Готовит виртуальное окружение бэкенда и ставит зависимости.
  2. Поднимает PostgreSQL (docker compose up -d; если база уже доступна — пропускает).
  3. Накатывает миграции (alembic upgrade head) и демо-данные (python -m app.seed --demo).
  4. Собирает фронты и запускает их через `vite preview` (не dev-серверы):
     staff — http://localhost:5173, внешний сайт — http://localhost:5174.
  5. Запускает бэкенд uvicorn на http://localhost:8000.

Флаг --fresh пересоздаёт схему базы с нуля: демо-данные (включая очередь
табло) привязаны к дате сида, поэтому перед показом после репетиции
запускайте с --fresh — табло и очередь будут живыми.

Остановка — Ctrl+C: все запущенные процессы завершаются.

Требования: Python 3.11+, Node.js 20+ (с npm), Docker Desktop (или уже поднятый
PostgreSQL 17 с параметрами по умолчанию: localhost:5432, pandora/pandora,
база pandora_clinic; переопределяется переменной DATABASE_URL).
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

# Совпадает с app/config.py и docker-compose.yml
DEFAULT_DB_URL = "postgresql+psycopg2://pandora:pandora@localhost:5432/pandora_clinic"
DB_READY_TIMEOUT_SEC = 90

BACKEND_PORT = 8000
STAFF_PORT = 5173
PUBLIC_PORT = 5174

# Сервисы демо: (имя, команда, рабочая директория, порт для проверки готовности)
SERVICES: list[tuple[str, list[str], Path, int]] = []


def log(message: str) -> None:
    print(f"[demo] {message}", flush=True)


def step(number: int, total: int, message: str) -> None:
    print(f"\n=== [{number}/{total}] {message} ===", flush=True)


def die(message: str) -> None:
    print(f"\n[demo] ОШИБКА: {message}", file=sys.stderr, flush=True)
    sys.exit(1)


# --------------------------------------------------------------------------- #
# PostgreSQL
# --------------------------------------------------------------------------- #


def parse_db_url(url: str) -> dict[str, str | int]:
    """Вытаскивает параметры подключения из sqlalchemy-URL (схему отбрасываем)."""
    rest = url.split("://", 1)[1]
    creds, _, hostpart = rest.rpartition("@")
    if not creds:
        creds, hostpart = "", rest
    user, _, password = creds.partition(":")
    host, _, port = hostpart.partition(":")
    port = port.split("/", 1)[0] or "5432"
    dbname = hostpart.partition("/")[2] or "pandora_clinic"
    return {
        "host": host or "localhost",
        "port": int(port),
        "user": user or "pandora",
        "password": password,
        "dbname": dbname,
    }


def db_ready(python: Path) -> bool:
    """Проверяет подключение к PostgreSQL (через psycopg2 из окружения бэкенда)."""
    params = parse_db_url(os.environ.get("DATABASE_URL", DEFAULT_DB_URL))
    code = (
        "import sys, psycopg2; "
        "psycopg2.connect(host=sys.argv[1], port=int(sys.argv[2]), user=sys.argv[3], "
        "password=sys.argv[4], dbname=sys.argv[5], connect_timeout=2).close()"
    )
    probe = subprocess.run(
        [
            str(python),
            "-c",
            code,
            str(params["host"]),
            str(params["port"]),
            str(params["user"]),
            str(params["password"]),
            str(params["dbname"]),
        ],
        capture_output=True,
    )
    return probe.returncode == 0


def ensure_postgres(python: Path) -> None:
    if db_ready(python):
        log("PostgreSQL уже доступен — пропускаю запуск")
        return

    docker = shutil.which("docker")
    if docker is None:
        die(
            "PostgreSQL не доступен, а Docker не найден.\n"
            "Варианты:\n"
            "  1) установить Docker Desktop (https://www.docker.com/products/docker-desktop/)\n"
            "     и перезапустить команду;\n"
            "  2) поднять PostgreSQL 17 вручную (по умолчанию localhost:5432, пользователь\n"
            "     pandora/pandora, база pandora_clinic — как в docker-compose.yml);\n"
            "  3) указать свою базу переменной DATABASE_URL, например:\n"
            "       DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/dbname python scripts/demo.py"
        )

    log("Запускаю PostgreSQL через docker compose…")
    subprocess.run(
        [docker, "compose", "up", "-d"], cwd=ROOT, check=True
    )
    deadline = time.monotonic() + DB_READY_TIMEOUT_SEC
    while time.monotonic() < deadline:
        if db_ready(python):
            log("PostgreSQL готов")
            return
        time.sleep(2)
    die("PostgreSQL не стал доступен за 90 секунд — см. логи: docker compose logs db")


def reset_database(python: Path) -> None:
    """Пересоздаёт схему public — чистый лист для демо-сида (--fresh)."""
    log("Сбрасываю базу: DROP SCHEMA public CASCADE…")
    params = parse_db_url(os.environ.get("DATABASE_URL", DEFAULT_DB_URL))
    code = (
        "import sys, psycopg2; "
        "conn = psycopg2.connect(host=sys.argv[1], port=int(sys.argv[2]), "
        "user=sys.argv[3], password=sys.argv[4], dbname=sys.argv[5]); "
        "conn.autocommit = True; "
        "cur = conn.cursor(); "
        "cur.execute('DROP SCHEMA public CASCADE'); "
        "cur.execute('CREATE SCHEMA public'); "
        "conn.close()"
    )
    subprocess.run(
        [
            str(python),
            "-c",
            code,
            str(params["host"]),
            str(params["port"]),
            str(params["user"]),
            str(params["password"]),
            str(params["dbname"]),
        ],
        check=True,
    )


# --------------------------------------------------------------------------- #
# Окружение бэкенда
# --------------------------------------------------------------------------- #


def venv_python() -> Path:
    """Путь к python виртуального окружения: корневое .venv или backend/.venv."""
    bindir = "Scripts" if os.name == "nt" else "bin"
    for candidate in (ROOT / ".venv", BACKEND_DIR / ".venv"):
        python = candidate / bindir / ("python.exe" if os.name == "nt" else "python")
        if python.exists():
            return python
    die(
        "Не найдено виртуальное окружение (.venv в корне или в backend/).\n"
        "Создайте его и повторите запуск:\n"
        "  python -m venv .venv\n"
        "  .venv/Scripts/pip install -r backend/requirements.txt"
        " -r backend/requirements-dev.txt   (Windows)\n"
        "  .venv/bin/pip install -r backend/requirements.txt"
        " -r backend/requirements-dev.txt   (macOS/Linux)"
    )
    raise AssertionError("unreachable")


def ensure_backend_env() -> Path:
    python = venv_python()
    probe = subprocess.run(
        [str(python), "-c", "import fastapi, uvicorn, alembic, sqlalchemy, psycopg2"],
        capture_output=True,
    )
    if probe.returncode == 0:
        log(f"Окружение бэкенда готово ({python})")
        return python

    log("Ставлю зависимости бэкенда (requirements.txt + requirements-dev.txt)…")
    subprocess.run(
        [
            str(python),
            "-m",
            "pip",
            "install",
            "-q",
            "-r",
            str(BACKEND_DIR / "requirements.txt"),
            "-r",
            str(BACKEND_DIR / "requirements-dev.txt"),
        ],
        check=True,
    )
    return python


# --------------------------------------------------------------------------- #
# Сборка и запуск
# --------------------------------------------------------------------------- #


def npm_bin() -> str:
    npm = shutil.which("npm")
    if npm is None:
        die("npm не найден — нужен Node.js 20+ (https://nodejs.org/)")
    return npm


def build_frontend() -> None:
    npm = npm_bin()
    if not (FRONTEND_DIR / "node_modules").exists():
        log("node_modules не найден — npm install…")
        subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=True)
    log("Собираю фронты (tsc + vite build)…")
    subprocess.run([npm, "run", "build"], cwd=FRONTEND_DIR, check=True)


def port_taken(port: int) -> bool:
    """Порт занят, если кто-то слушает на IPv4 или IPv6 (vite сидит на ::1)."""
    for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        with socket.socket(family, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            if sock.connect_ex((host, port)) == 0:
                return True
    return False


def wait_http(url: str, timeout_sec: int = 60) -> None:
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return
        except Exception:  # noqa: BLE001 - сервис ещё поднимается
            pass
        time.sleep(1)
    die(f"{url} не отвечает — сервис не поднялся")


def start_services(python: Path) -> list[subprocess.Popen]:
    npm = npm_bin()
    plans: list[tuple[str, list[str], Path, int]] = [
        (
            "backend (uvicorn)",
            [
                str(python),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(BACKEND_PORT),
            ],
            BACKEND_DIR,
            BACKEND_PORT,
        ),
        (
            "staff (vite preview)",
            [npm, "run", "preview", "-w", "@pandora/staff"],
            FRONTEND_DIR,
            STAFF_PORT,
        ),
        (
            "public (vite preview)",
            [npm, "run", "preview", "-w", "@pandora/public"],
            FRONTEND_DIR,
            PUBLIC_PORT,
        ),
    ]

    for name, _, _, port in plans:
        if port_taken(port):
            die(
                f"Порт {port} занят — кажется, «{name}» уже запущен.\n"
                "Остановите предыдущий экземпляр (Ctrl+C в его окне) и повторите."
            )

    popens: list[subprocess.Popen] = []
    for name, cmd, cwd, port in plans:
        log(f"Запускаю {name} на :{port}")
        kwargs: dict = {}
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs["start_new_session"] = True
        popens.append(subprocess.Popen(cmd, cwd=cwd, **kwargs))

    wait_http(f"http://localhost:{BACKEND_PORT}/healthz")
    wait_http(f"http://localhost:{STAFF_PORT}/")
    wait_http(f"http://localhost:{PUBLIC_PORT}/")
    return popens


def stop_services(popens: list[subprocess.Popen]) -> None:
    for proc in popens:
        if proc.poll() is not None:
            continue
        if os.name == "nt":
            # /T убивает и детей (npm → node → vite), иначе останутся висеть
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
            )
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    for proc in popens:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def print_summary() -> None:
    print(
        "\n"
        "============================================================\n"
        " Демо-окружение поднято:\n"
        "\n"
        f"   Персонал (staff):   http://localhost:{STAFF_PORT}\n"
        f"   Внешний сайт:       http://localhost:{PUBLIC_PORT}\n"
        f"   Табло (ТВ):         http://localhost:{STAFF_PORT}/board\n"
        f"   API и Swagger:      http://localhost:{BACKEND_PORT}/docs\n"
        "\n"
        " Учётные записи (демо-сид):\n"
        "   admin / admin           — администратор\n"
        "   registrar / registrar   — регистратура\n"
        "   ivanova, sokolov, kim, volkov — врачи, пароль doctor\n"
        "\n"
        " Сценарий показа — раздел 5 PLAN.md. Остановка — Ctrl+C.\n"
        "============================================================",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Поднять демо-окружение PandoraClinica одной командой"
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="пересоздать базу с нуля и залить демо-данные заново "
        "(живая очередь на табло привязана к дате сида)",
    )
    args = parser.parse_args()

    total_steps = 6
    popens: list[subprocess.Popen] = []

    # Окружение бэкенда готовим первым: через его python проверяем доступность БД
    step(1, total_steps, "Окружение бэкенда")
    python = ensure_backend_env()

    step(2, total_steps, "PostgreSQL")
    ensure_postgres(python)
    if args.fresh:
        reset_database(python)

    step(3, total_steps, "Миграции базы (alembic upgrade head)")
    subprocess.run(
        [str(python), "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        check=True,
    )

    step(4, total_steps, "Демо-данные (python -m app.seed --demo)")
    subprocess.run(
        [str(python), "-m", "app.seed", "--demo"],
        cwd=BACKEND_DIR,
        check=True,
    )

    step(5, total_steps, "Сборка фронтов")
    build_frontend()

    step(6, total_steps, "Запуск сервисов")
    try:
        popens = start_services(python)
        print_summary()
        while True:
            for proc in popens:
                if proc.poll() is not None:
                    die("Один из сервисов завершился — смотрите вывод выше")
            time.sleep(2)
    except KeyboardInterrupt:
        log("Останавливаю сервисы…")
    finally:
        stop_services(popens)
        log("Готово")


if __name__ == "__main__":
    main()
