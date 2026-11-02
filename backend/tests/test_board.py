"""Табло очереди: публичный эндпоинт для ТВ, без данных пациентов."""

from sqlalchemy.orm import sessionmaker

from app.models import Ticket, TicketStatus
from tests.conftest import auth_headers
from tests.test_full_cycle import TOMORROW, setup_world


def board_world(client, db_engine):
    """Оба врача в кабинетах, пациент с талонами №1, №2 (Иванов) и №3 (Петрова)."""
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)
    for doctor, room in ((doctors["ivanov"], rooms["universal"]), (doctors["petrova"], rooms["us"])):
        client.post("/api/registrar/workdays", headers=reg, json={
            "doctor_id": doctor, "room_id": room, "work_date": str(TOMORROW)})

    patient = client.post("/api/registrar/patients", headers=reg, json={}).json()
    morning = client.get(f"/api/registrar/morning?date={TOMORROW}", headers=reg).json()
    workdays = {item["room_number"]: item["workday_id"] for item in morning["occupied"]}

    tickets = [
        client.post("/api/registrar/tickets", headers=reg, json={
            "patient_id": patient["id"], "doctor_workday_id": workdays["204"]}).json()
        for _ in range(2)
    ]
    tickets.append(client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": patient["id"], "doctor_workday_id": workdays["305"]}).json())
    return admin, reg, specs, rooms, doctors, workdays, patient, tickets


def room_by_number(board, number: str) -> dict:
    return next(room for room in board["rooms"] if room["room_number"] == number)


def get_board(client) -> dict:
    response = client.get(f"/api/board?date={TOMORROW}")
    assert response.status_code == 200, response.text
    return response.json()


def test_board_requires_no_auth(client, db_engine):
    board_world(client, db_engine)
    assert get_board(client)["rooms"]  # без токена отдаёт данные


def test_board_shows_waiting_queue(client, db_engine):
    board_world(client, db_engine)
    board = get_board(client)

    assert len(board["rooms"]) == 2
    r204 = room_by_number(board, "204")
    assert r204["doctor_name"] == "Иванов Иван Иванович"
    assert r204["specialization_name"] == "Терапия"
    assert r204["waiting_numbers"] == [1, 2]
    assert r204["current"] == []
    assert room_by_number(board, "305")["waiting_numbers"] == [3]


def test_board_moves_called_to_current(client, db_engine):
    admin, reg, specs, rooms, doctors, workdays, patient, tickets = board_world(client, db_engine)
    doc = auth_headers(client, "ivanov")
    assert client.post(f"/api/doctor/queue/{tickets[0]['id']}/call", headers=doc).status_code == 200

    board = get_board(client)
    r204 = room_by_number(board, "204")
    assert r204["current"] == [{"number": 1, "status": "called"}]
    assert r204["waiting_numbers"] == [2]


def test_board_after_visit(client, db_engine):
    admin, reg, specs, rooms, doctors, workdays, patient, tickets = board_world(client, db_engine)
    doc = auth_headers(client, "ivanov")
    client.post(f"/api/doctor/queue/{tickets[0]['id']}/call", headers=doc)
    assert client.post("/api/doctor/visits", headers=doc, json={
        "ticket_id": tickets[0]["id"]}).status_code == 201

    board = get_board(client)
    r204 = room_by_number(board, "204")
    assert r204["current"] == []
    assert r204["waiting_numbers"] == [2]


def test_board_ignores_unassigned_tickets(client, db_engine):
    admin, reg, specs, rooms, doctors, workdays, patient, tickets = board_world(client, db_engine)

    # талон «не распределён» (без рабочего дня врача) — напрямую в БД
    session = sessionmaker(bind=db_engine, expire_on_commit=False)()
    session.add(Ticket(ticket_date=TOMORROW, number=4, patient_id=patient["id"],
                       doctor_workday_id=None, status=TicketStatus.waiting))
    session.commit()
    session.close()

    board = get_board(client)
    numbers = {n for room in board["rooms"] for n in room["waiting_numbers"]}
    assert numbers == {1, 2, 3}
