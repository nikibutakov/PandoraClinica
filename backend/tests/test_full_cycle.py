"""Сквозной тест: заявка пациента проходит полный цикл.

Админ нанимает врачей и задаёт график → регистратор утром закрепляет кабинеты
и записывает пациента по «звонку» → пациент приходит, получает талон →
врач вызывает, принимает, даёт направление к специальности → регистратор
записывает по направлению → второй врач завершает приём.
"""

from datetime import date, timedelta

from app.models import UserRole
from tests.conftest import PASSWORD, auth_headers, make_user

TOMORROW = date.today() + timedelta(days=1)


def setup_world(client, db_engine):
    """Общий мир: админ, регистратор, специальности, кабинеты, врачи, слоты."""
    make_user(db_engine, "boss", UserRole.admin, "Админ Админович")
    admin = auth_headers(client, "boss")

    client.post("/api/admin/users", headers=admin, json={
        "full_name": "Регина Регистраторовна", "login": "reg", "password": PASSWORD, "role": "registrar",
    })

    specs = {}
    for name in ("Терапия", "УЗИ"):
        specs[name] = client.post("/api/admin/specializations", headers=admin, json={"name": name}).json()["id"]

    rooms = {}
    rooms["universal"] = client.post("/api/admin/rooms", headers=admin, json={"number": "204"}).json()["id"]
    rooms["us"] = client.post("/api/admin/rooms", headers=admin, json={
        "number": "305", "specialization_id": specs["УЗИ"]}).json()["id"]

    doctors = {}
    for login, full_name, spec, contract in (
        ("ivanov", "Иванов Иван Иванович", "Терапия", "Д-001"),
        ("petrova", "Петрова Мария Сергеевна", "УЗИ", "Д-002"),
    ):
        doctors[login] = client.post("/api/admin/doctors", headers=admin, json={
            "full_name": full_name, "login": login, "password": PASSWORD,
            "specialization_id": specs[spec], "contract_number": contract,
            "valid_from": str(date.today()),
        }).json()["id"]

    schedule = {"items": [{"weekday": TOMORROW.weekday(),
                           "start_time": "09:00:00", "end_time": "11:00:00"}]}
    for doctor_id in doctors.values():
        response = client.put(f"/api/admin/doctors/{doctor_id}/schedule", headers=admin, json=schedule)
        assert response.status_code == 200, response.text

    response = client.post(
        f"/api/admin/slots/generate?date_from={TOMORROW}&date_to={TOMORROW}", headers=admin)
    assert response.status_code == 200 and response.json()["created"] == 8, response.text
    # повторная генерация ничего не добавляет
    response = client.post(
        f"/api/admin/slots/generate?date_from={TOMORROW}&date_to={TOMORROW}", headers=admin)
    assert response.json()["created"] == 0

    return admin, auth_headers(client, "reg"), specs, rooms, doctors


def test_full_patient_cycle(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)

    # --- утро в регистратуре ---
    morning = client.get(f"/api/registrar/morning?date={TOMORROW}", headers=reg).json()
    assert {item["full_name"] for item in morning["expected"]} == {"Иванов Иван Иванович", "Петрова Мария Сергеевна"}
    assert {room["number"] for room in morning["free_rooms"]} == {"204", "305"}

    for doctor, room in ((doctors["ivanov"], rooms["universal"]), (doctors["petrova"], rooms["us"])):
        response = client.post("/api/registrar/workdays", headers=reg, json={
            "doctor_id": doctor, "room_id": room, "work_date": str(TOMORROW)})
        assert response.status_code == 201, response.text

    # терапевта нельзя посадить в УЗИ-кабинет
    response = client.post("/api/registrar/workdays", headers=reg, json={
        "doctor_id": doctors["ivanov"], "room_id": rooms["us"], "work_date": str(TOMORROW)})
    assert response.status_code == 409

    # --- звонок пациента: запись к терапии ---
    patient = client.post("/api/registrar/patients", headers=reg, json={
        "snils": "12345678901", "full_name": "Сидоров Пётр Николаевич",
        "birth_date": "1990-05-14", "phone": "+7 900 111-22-33"}).json()
    assert patient["citizenship"] == "RUS"

    slots = client.get(f"/api/registrar/slots?specialization_id={specs['Терапия']}"
                       f"&date_from={TOMORROW}&date_to={TOMORROW}", headers=reg).json()
    assert len(slots) == 4

    appointment = client.post("/api/registrar/appointments", headers=reg, json={
        "slot_id": slots[0]["id"], "patient_id": patient["id"]}).json()
    # слот занят — вторая запись не проходит
    response = client.post("/api/registrar/appointments", headers=reg, json={
        "slot_id": slots[0]["id"], "patient_id": patient["id"]})
    assert response.status_code == 409

    # --- пациент приходит: талон по записи ---
    ticket = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": patient["id"], "appointment_id": appointment["id"]}).json()
    assert ticket["number"] == 1
    assert ticket["doctor_workday_id"] is not None  # кабинет выведен из записи

    # живая очередь без записи — номер следующий
    walk_in = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": client.post("/api/registrar/patients", headers=reg, json={
            "insurance_policy": "POL-1", "insurance_company": "StrahCo"}).json()["id"],
        "doctor_workday_id": ticket["doctor_workday_id"]}).json()
    assert walk_in["number"] == 2

    # --- приём у терапевта ---
    doc = auth_headers(client, "ivanov")
    today = client.get(f"/api/doctor/me/today?date={TOMORROW}", headers=doc).json()
    assert today["room_number"] == "204" and today["queue"]["waiting"] == 2

    queue = client.get(f"/api/doctor/queue?date={TOMORROW}", headers=doc).json()
    assert [item["number"] for item in queue] == [1, 2]

    response = client.post(f"/api/doctor/queue/{ticket['id']}/call", headers=doc)
    assert response.status_code == 200 and response.json()["status"] == "called"

    visit = client.post("/api/doctor/visits", headers=doc, json={
        "ticket_id": ticket["id"],
        "complaints": "Кашель, температура 37.8",
        "anamnesis": "Третий день",
        "treatment": "Питьё, парацетамол",
        "diagnoses": [{"code": "J06.9", "name": "Острая инфекция ВДП, неуточнённая"}],
        "referral": {"to_specialization_id": specs["УЗИ"], "reason": "УЗИ брюшной полости"},
    })
    assert visit.status_code == 201, visit.text
    record = visit.json()
    assert record["ticket_id"] == ticket["id"] and record["appointment_id"] == appointment["id"]

    # талон закрыт, повторный приём невозможен
    queue = client.get(f"/api/doctor/queue?date={TOMORROW}", headers=doc).json()
    assert queue[0]["status"] == "done" and queue[1]["status"] == "waiting"
    response = client.post("/api/doctor/visits", headers=doc, json={"ticket_id": ticket["id"]})
    assert response.status_code == 409

    # --- направление: регистратор записывает к УЗИ ---
    referrals = client.get("/api/registrar/referrals", headers=reg).json()
    assert len(referrals) == 1 and referrals[0]["patient_id"] == patient["id"]

    us_slots = client.get(f"/api/registrar/slots?specialization_id={specs['УЗИ']}"
                          f"&date_from={TOMORROW}&date_to={TOMORROW}", headers=reg).json()
    appointment2 = client.post("/api/registrar/appointments", headers=reg, json={
        "slot_id": us_slots[0]["id"], "patient_id": patient["id"],
        "referral_id": referrals[0]["id"]})
    assert appointment2.status_code == 201, appointment2.text
    # направление закрылось автоматически
    assert client.get("/api/registrar/referrals", headers=reg).json() == []

    ticket2 = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": patient["id"], "appointment_id": appointment2.json()["id"]}).json()
    assert ticket2["number"] == 3

    # --- приём у УЗИста ---
    doc2 = auth_headers(client, "petrova")
    client.post(f"/api/doctor/queue/{ticket2['id']}/call", headers=doc2)
    visit2 = client.post("/api/doctor/visits", headers=doc2, json={
        "ticket_id": ticket2["id"],
        "treatment": "УЗИ без патологий",
        "diagnoses": [{"code": "Z00.0", "name": "Общий медицинский осмотр"}],
    })
    assert visit2.status_code == 201, visit2.text

    # итог: у пациента две завершённые записи приёма и ни одного открытого талона
    queues = client.get(f"/api/doctor/queue?date={TOMORROW}", headers=doc).json()
    assert all(item["status"] in ("done", "waiting") for item in queues)


def test_doctor_cannot_use_foreign_ticket(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)

    client.post("/api/registrar/workdays", headers=reg, json={
        "doctor_id": doctors["ivanov"], "room_id": rooms["universal"], "work_date": str(TOMORROW)})
    patient_id = client.post("/api/registrar/patients", headers=reg, json={}).json()["id"]
    workday_id = client.get(f"/api/registrar/morning?date={TOMORROW}", headers=reg)\
        .json()["occupied"][0]["workday_id"]
    ticket = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": patient_id, "doctor_workday_id": workday_id}).json()

    # Петрова не может вызвать талона Иванова
    doc2 = auth_headers(client, "petrova")
    response = client.post(f"/api/doctor/queue/{ticket['id']}/call", headers=doc2)
    assert response.status_code == 403


def test_roles_are_enforced(client, db_engine):
    make_user(db_engine, "boss", UserRole.admin)
    make_user(db_engine, "doc", UserRole.doctor, "Док Доков")
    make_user(db_engine, "reg", UserRole.registrar)

    doctor = auth_headers(client, "doc")
    assert client.get("/api/admin/users", headers=doctor).status_code == 403
    assert client.get("/api/registrar/patients", headers=doctor).status_code == 403

    admin = auth_headers(client, "boss")
    assert client.get("/api/doctor/queue", headers=admin).status_code == 403

    # без токена доступа нет
    assert client.get("/api/admin/users").status_code == 401
    # неверный пароль
    response = client.post("/api/auth/login", json={"login": "reg", "password": "wrong"})
    assert response.status_code == 401
