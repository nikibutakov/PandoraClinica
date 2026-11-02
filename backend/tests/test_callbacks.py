"""Заявки на перезвон: публичное создание и обработка регистратурой."""

from datetime import datetime, timedelta

from sqlalchemy.orm import sessionmaker

from app.models import CallbackRequest, CallbackStatus, UserRole
from tests.conftest import auth_headers, make_user


def test_public_creates_callback(client):
    response = client.post("/api/public/callbacks", json={
        "phone": "+7 900 111-22-33",
        "full_name": "Сидоров Пётр",
        "comment": "хочу к терапевту",
    })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["phone"] == "+7 900 111-22-33"
    assert body["full_name"] == "Сидоров Пётр"
    assert body["status"] == "new"
    assert body["id"] and body["created_at"]


def test_callback_rejects_bad_phone(client):
    assert client.post("/api/public/callbacks", json={"phone": "abc"}).status_code == 422
    assert client.post("/api/public/callbacks", json={"phone": "12345"}).status_code == 422


def test_callback_rejects_nondigit_phone(client):
    """Телефон — не только разрешённые символы, но и минимум 7 цифр."""
    assert client.post("/api/public/callbacks", json={"phone": "-------"}).status_code == 422
    assert client.post("/api/public/callbacks", json={"phone": "(() () - "}).status_code == 422


def test_registrar_processes_callbacks(client, db_engine):
    make_user(db_engine, "reg", UserRole.registrar, "Регина Регистраторовна")
    reg = auth_headers(client, "reg")

    first = client.post("/api/public/callbacks", json={"phone": "+7 900 111-22-33"}).json()
    second = client.post("/api/public/callbacks", json={"phone": "+7 900 555-66-77"}).json()

    listed = client.get("/api/registrar/callbacks", headers=reg).json()
    assert [item["id"] for item in listed] == [first["id"], second["id"]]  # старые первыми

    new_ids = [item["id"] for item in client.get("/api/registrar/callbacks?status=new", headers=reg).json()]
    assert new_ids == [first["id"], second["id"]]

    response = client.patch(
        f"/api/registrar/callbacks/{first['id']}", headers=reg, json={"status": "in_progress"})
    assert response.status_code == 200 and response.json()["status"] == "in_progress"

    in_progress = client.get("/api/registrar/callbacks?status=in_progress", headers=reg).json()
    assert [item["id"] for item in in_progress] == [first["id"]]

    client.patch(f"/api/registrar/callbacks/{first['id']}", headers=reg, json={"status": "done"})
    remaining_new = client.get("/api/registrar/callbacks?status=new", headers=reg).json()
    assert [item["id"] for item in remaining_new] == [second["id"]]


def test_callbacks_forbidden_without_registrar(client):
    assert client.get("/api/registrar/callbacks").status_code == 401


def test_callbacks_list_shows_newest_beyond_limit(client, db_engine):
    """Лимит списка не должен прятать свежие заявки: берём последние, а не первые 200."""
    make_user(db_engine, "reg", UserRole.registrar, "Регина Регистраторовна")
    reg = auth_headers(client, "reg")

    session = sessionmaker(bind=db_engine, expire_on_commit=False)()
    session.add_all(
        CallbackRequest(
            phone=f"+7 900 000-{i:04d}",
            status=CallbackStatus.done,
            created_at=datetime(2026, 1, 1, 12, 0, 0) + timedelta(minutes=i),
        )
        for i in range(200)
    )
    session.commit()
    session.close()

    newest = client.post("/api/public/callbacks", json={"phone": "+7 900 999-99-99"}).json()
    listed = client.get("/api/registrar/callbacks", headers=reg).json()
    assert len(listed) == 200
    assert newest["id"] in [item["id"] for item in listed]
    assert listed[-1]["id"] == newest["id"]  # свежая — последней (старые первыми)
