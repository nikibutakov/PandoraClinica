"""Создание первого администратора.

Запуск из backend/: python -m app.seed [логин] [пароль]
По умолчанию admin / admin — пароль нужно сменить после входа.
"""

import sys

from sqlalchemy import select

from app.database import SessionLocal
from app.models import AppUser, UserRole
from app.security import hash_password


def main() -> None:
    login = sys.argv[1] if len(sys.argv) > 1 else "admin"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin"

    db = SessionLocal()
    try:
        if db.scalar(select(AppUser).where(AppUser.login == login)):
            print(f"Пользователь {login!r} уже существует")
            return
        db.add(
            AppUser(
                full_name="Администратор клиники",
                login=login,
                password_hash=hash_password(password),
                role=UserRole.admin,
            )
        )
        db.commit()
        print(f"Создан администратор {login!r}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
