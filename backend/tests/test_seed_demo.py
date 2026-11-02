"""Демо-сид: состав данных и работа ключевых экранов на них.

Критерий готовности B2 из плана: после --demo на пустой базе утренний экран
показывает врачей, есть слоты на запись, табло показывает очередь.
"""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.models import Doctor, Patient, Slot, Ticket, TicketStatus
from app.seed import ensure_admin, seed_demo
from app.utils import clinic_today


def run_seed_demo(engine) -> None:
    """Прогон демо-сида напрямую в тестовой базе (как это делает CLI с --demo)."""
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        ensure_admin(session, "admin", "admin")
        assert seed_demo(session) is True
    finally:
        session.close()


def test_demo_world_composition(db_engine):
    run_seed_demo(db_engine)
    session = sessionmaker(bind=db_engine, expire_on_commit=False)()
    try:
        assert session.scalar(select(func.count()).select_from(Doctor)) == 4
        assert session.scalar(select(func.count()).select_from(Patient)) == 3

        # слоты сгенерированы на 14 дней вперёд, включая последний день периода
        horizon = clinic_today() + timedelta(days=13)
        assert session.scalar(
            select(func.count()).select_from(Slot).where(Slot.starts_at >= horizon)
        ) > 0

        # очередь на сегодня: есть вызванный номер и ожидающие
        statuses = session.scalars(
            select(Ticket.status).where(Ticket.ticket_date == clinic_today())
        ).all()
        assert TicketStatus.called in statuses
        assert statuses.count(TicketStatus.waiting) >= 3
    finally:
        session.close()


def test_demo_seed_is_idempotent(db_engine):
    run_seed_demo(db_engine)
    session = sessionmaker(bind=db_engine, expire_on_commit=False)()
    try:
        assert seed_demo(session) is False  # повторный запуск — no-op
        assert session.scalar(select(func.count()).select_from(Doctor)) == 4
    finally:
        session.close()


def test_demo_morning_board_and_schedule(client: TestClient, db_engine):
    run_seed_demo(db_engine)

    # вход под демо-админом из сида
    login = client.post("/api/auth/login", json={"login": "admin", "password": "admin"})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # утренний экран: в любой день недели кто-то из врачей на смене
    morning = client.get("/api/registrar/morning", headers=headers)
    assert morning.status_code == 200, morning.text
    expected = morning.json()["expected"]
    assert expected
    assert all(item["specialization_name"] for item in expected)

    # слоты на запись: у терапии есть свободные слоты в ближайшие 14 дней
    specs = client.get("/api/public/specializations")
    assert specs.status_code == 200
    therapy = next(s for s in specs.json() if s["name"] == "Терапия")
    schedule = client.get(
        "/api/public/schedule",
        params={
            "specialization_id": therapy["id"],
            "date_from": str(clinic_today()),
            "date_to": str(clinic_today() + timedelta(days=13)),
        },
    )
    assert schedule.status_code == 200, schedule.text
    assert schedule.json()

    # табло: закреплённые врачи и живая очередь
    board = client.get("/api/board")
    assert board.status_code == 200, board.text
    rooms = board.json()["rooms"]
    assert rooms
    assert any(room["waiting_numbers"] or room["current"] for room in rooms)


def test_demo_doctor_login(client: TestClient, db_engine):
    run_seed_demo(db_engine)
    response = client.post("/api/auth/login", json={"login": "ivanova", "password": "doctor"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role"] == "doctor"
    assert body["full_name"] == "Иванова Анна Сергеевна"
