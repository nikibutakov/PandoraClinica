"""Вечерняя выгрузка приёмов за день: раздельно по гражданству РФ / не-РФ."""

from datetime import date, timedelta

from tests.conftest import auth_headers
from tests.test_full_cycle import TOMORROW, setup_world

FAR = date.today() + timedelta(days=30)


def export_world(client, db_engine):
    """Два завершённых приёма у Иванова: гражданин РФ по записи, иностранец из живой очереди."""
    admin, reg, specs, rooms, doctors = setup_world(client, db_engine)
    client.post("/api/registrar/workdays", headers=reg, json={
        "doctor_id": doctors["ivanov"], "room_id": rooms["universal"], "work_date": str(TOMORROW)})

    ru_patient = client.post("/api/registrar/patients", headers=reg, json={
        "snils": "12345678901", "full_name": "Сидоров Пётр Николаевич"}).json()
    slot = client.get(
        f"/api/registrar/slots?specialization_id={specs['Терапия']}"
        f"&date_from={TOMORROW}&date_to={TOMORROW}", headers=reg).json()[0]
    appointment = client.post("/api/registrar/appointments", headers=reg, json={
        "slot_id": slot["id"], "patient_id": ru_patient["id"]}).json()
    ru_ticket = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": ru_patient["id"], "appointment_id": appointment["id"]}).json()

    foreign_patient = client.post("/api/registrar/patients", headers=reg, json={
        "citizenship": "UZB", "full_name": "Aliyev Vali",
        "insurance_policy": "POL-9", "insurance_company": "StrahCo"}).json()
    morning = client.get(f"/api/registrar/morning?date={TOMORROW}", headers=reg).json()
    workday_id = morning["occupied"][0]["workday_id"]
    foreign_ticket = client.post("/api/registrar/tickets", headers=reg, json={
        "patient_id": foreign_patient["id"], "doctor_workday_id": workday_id}).json()

    doc = auth_headers(client, "ivanov")
    client.post("/api/doctor/visits", headers=doc, json={
        "ticket_id": ru_ticket["id"],
        "diagnoses": [{"code": "J06.9", "name": "Острая инфекция ВДП, неуточнённая"}]})
    client.post("/api/doctor/visits", headers=doc, json={
        "ticket_id": foreign_ticket["id"],
        "diagnoses": [{"code": "Z00.0", "name": "Общий медицинский осмотр"}]})

    return admin, reg, ru_patient, foreign_patient


def test_daily_export_splits_by_citizenship(client, db_engine):
    admin, reg, ru_patient, foreign_patient = export_world(client, db_engine)

    response = client.get(f"/api/admin/reports/daily?date={TOMORROW}", headers=admin)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["date"] == str(TOMORROW)
    assert data["ru"]["total"] == 1 and data["foreign"]["total"] == 1

    ru_visit = data["ru"]["visits"][0]
    assert ru_visit["patient"]["citizenship"] == "RUS"
    assert ru_visit["patient"]["snils"] == "12345678901"
    assert ru_visit["diagnoses"][0]["code"] == "J06.9"
    assert ru_visit["diagnoses"][0]["is_primary"] is True
    assert ru_visit["doctor_name"] == "Иванов Иван Иванович"
    assert ru_visit["specialization_name"] == "Терапия"
    assert ru_visit["ticket_number"] == 1

    foreign_visit = data["foreign"]["visits"][0]
    assert foreign_visit["patient"]["citizenship"] == "UZB"
    assert foreign_visit["patient"]["insurance_policy"] == "POL-9"
    assert foreign_visit["ticket_number"] == 2  # приём живой очереди попал в выгрузку


def test_daily_export_empty_day(client, db_engine):
    admin, reg, *_ = export_world(client, db_engine)
    data = client.get(f"/api/admin/reports/daily?date={FAR}", headers=admin).json()
    assert data["ru"]["total"] == 0 and data["foreign"]["total"] == 0
    assert data["ru"]["visits"] == [] and data["foreign"]["visits"] == []


def test_daily_export_admin_only(client, db_engine):
    export_world(client, db_engine)
    assert client.get(f"/api/admin/reports/daily?date={TOMORROW}").status_code == 401
    doc = auth_headers(client, "ivanov")
    assert client.get(f"/api/admin/reports/daily?date={TOMORROW}", headers=doc).status_code == 403
