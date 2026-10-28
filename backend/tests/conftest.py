"""Обвязка тестов: изолированная тестовая база и клиент API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.database import get_db
from app.main import app
from app.models import AppUser, Base, UserRole
from app.security import hash_password

TEST_DB = "pandora_clinic_test"
BASE_URL = "postgresql+psycopg2://pandora:pandora@localhost:5432/postgres"
TEST_URL = f"postgresql+psycopg2://pandora:pandora@localhost:5432/{TEST_DB}"

PASSWORD = "test-pass-1"


@pytest.fixture(scope="session", autouse=True)
def db_engine():
    """Тестовая база пересоздаётся один раз за прогон."""
    admin_engine = create_engine(BASE_URL, poolclass=NullPool, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
        conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    admin_engine.dispose()

    engine = create_engine(TEST_URL, poolclass=NullPool)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_tables(db_engine):
    """После каждого теста таблицы очищаются (порядок по зависимостям FK)."""
    yield
    with db_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client(db_engine):
    TestSession = sessionmaker(bind=db_engine, expire_on_commit=False)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_user(db_engine, login: str, role: UserRole, full_name: str = "") -> None:
    """Прямое создание пользователя в тестовой базе (для логина через API)."""
    session = sessionmaker(bind=db_engine, expire_on_commit=False)()
    try:
        session.add(
            AppUser(
                full_name=full_name or login.title(),
                login=login,
                password_hash=hash_password(PASSWORD),
                role=role,
            )
        )
        session.commit()
    finally:
        session.close()


def auth_headers(client: TestClient, login: str) -> dict:
    response = client.post("/api/auth/login", json={"login": login, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
