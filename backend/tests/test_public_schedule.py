"""Публичный график приёмов: свободные слоты по специальности, без врачей."""

from datetime import date, datetime, timedelta

from tests.test_full_cycle import TOMORROW, setup_world

YESTERDAY = date.today() - timedelta(days=1)


def test_public_schedule_lists_free_slots(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)

    response = client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={TOMORROW}")
    assert response.status_code == 200, response.text
    slots = response.json()
    assert len(slots) == 4
    assert {key for slot in slots for key in slot} == {
        "specialization_id", "specialization_name", "starts_at", "ends_at"}
    assert all(slot["specialization_name"] == "Терапия" for slot in slots)

    # записали пациента на первый свободный слот — он ушёл из графика
    patient = client.post("/api/registrar/patients", headers=reg, json={}).json()
    reg_slots = client.get(
        f"/api/registrar/slots?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={TOMORROW}", headers=reg).json()
    client.post("/api/registrar/appointments", headers=reg, json={
        "slot_id": reg_slots[0]["id"], "patient_id": patient["id"]})

    slots_after = client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={TOMORROW}").json()
    assert len(slots_after) == 3


def test_public_schedule_hides_doctors(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)
    response = client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={TOMORROW}")
    assert response.status_code == 200
    slots = response.json()
    assert isinstance(slots, list) and slots
    assert all("doctor" not in key for slot in slots for key in slot)


def test_public_schedule_excludes_past_slots(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)

    # вчерашний шаблон и вчерашние слоты тому же врачу
    items = client.get(f"/api/admin/doctors/{doctors['ivanov']}/schedule", headers=admin).json()
    items.append({"weekday": YESTERDAY.weekday(),
                  "start_time": "09:00:00", "end_time": "10:00:00"})
    assert client.put(f"/api/admin/doctors/{doctors['ivanov']}/schedule",
                      headers=admin, json={"items": items}).status_code == 200
    client.post(f"/api/admin/slots/generate?date_from={YESTERDAY}&date_to={YESTERDAY}", headers=admin)

    slots = client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={YESTERDAY}&date_to={TOMORROW}").json()
    assert len(slots) == 4  # только завтрашние
    assert all(datetime.fromisoformat(slot["starts_at"]).date() == TOMORROW for slot in slots)


def test_public_specializations_list(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)
    response = client.get("/api/public/specializations")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    assert "Терапия" in names and "УЗИ" in names


def test_public_schedule_validates_range(client, db_engine):
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)
    far = TOMORROW + timedelta(days=100)
    assert client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={YESTERDAY}").status_code == 400
    assert client.get(
        f"/api/public/schedule?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={far}").status_code == 400
