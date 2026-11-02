"""Наполнение базы: первый администратор и демо-данные для показа.

Запуск из backend/:
    python -m app.seed [логин] [пароль]   # только первый админ (по умолчанию admin/admin)
    python -m app.seed --demo             # админ + регистратор + врачи, слоты, очередь
"""

import argparse
from dataclasses import dataclass
from datetime import date, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AppUser,
    Contract,
    ContractStatus,
    Doctor,
    DoctorWorkday,
    Patient,
    Room,
    ScheduleTemplate,
    Specialization,
    Ticket,
    TicketStatus,
    UserRole,
)
from app.routers.admin import generate_slots
from app.security import hash_password
from app.utils import clinic_now, clinic_today

DEMO_SPECIALIZATIONS = ("Терапия", "УЗИ", "Кардиология", "Хирургия")
DEMO_DOCTOR_PASSWORD = "doctor"
DEMO_REGISTRAR_LOGIN = "registrar"
DEMO_REGISTRAR_PASSWORD = "registrar"
DEMO_DAYS_AHEAD = 14
# универсальные кабинеты + профильный УЗИ; ключи совпадают с number в БД
UNIVERSAL_ROOMS = ("101", "102")
UZI_ROOM = "201"


@dataclass(frozen=True)
class DemoDoctor:
    """Врач демо-состава: учётка, специальность и недельный график."""

    full_name: str
    login: str
    specialization: str
    weekdays: tuple[int, ...]  # 0 — понедельник … 6 — воскресенье
    start: time
    end: time


# График покрывает всю неделю: в любой день кто-то принимает — демо не зависит
# от дня запуска. УЗИ-врач ходит по своим дням и сидит только в УЗИ-кабинете.
DEMO_DOCTORS = (
    DemoDoctor("Иванова Анна Сергеевна", "ivanova", "Терапия", (0, 1, 2, 3, 4), time(9), time(14)),
    DemoDoctor("Соколов Дмитрий Павлович", "sokolov", "Кардиология", (0, 2, 4), time(14), time(18)),
    DemoDoctor("Ким Ольга Викторовна", "kim", "УЗИ", (1, 3, 5), time(9), time(13)),
    DemoDoctor("Волков Артём Игоревич", "volkov", "Хирургия", (5, 6), time(10), time(14)),
)


def ensure_admin(db: Session, login: str, password: str) -> None:
    """Создать первого администратора, если его ещё нет."""
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


def seed_demo(db: Session) -> bool:
    """Наполнить базу демо-данными: справочники, врачи с графиком и договорами,
    слоты на 14 дней, пациенты, сегодняшняя очередь для табло.

    Возвращает False, если демо-данные уже создавались (повторный запуск — no-op).
    """
    marker = db.scalar(select(Specialization).where(Specialization.name == DEMO_SPECIALIZATIONS[0]))
    if marker:
        print("Демо-данные уже созданы — пропускаю")
        return False

    db.add(
        AppUser(
            full_name="Смирнова Елена Викторовна",
            login=DEMO_REGISTRAR_LOGIN,
            password_hash=hash_password(DEMO_REGISTRAR_PASSWORD),
            role=UserRole.registrar,
        )
    )
    specs = _create_specializations(db)
    rooms = _create_rooms(db, specs)
    doctors = _create_doctors(db, specs)
    patients = _create_patients(db)
    db.commit()

    today = clinic_today()
    result = generate_slots(
        date_from=today,
        date_to=today + timedelta(days=DEMO_DAYS_AHEAD - 1),
        db=db,
    )
    print(f"Сгенерированы слоты: {result['created']} шт. на {result['period']}")

    _create_today_queue(db, rooms, doctors, patients)
    db.commit()

    print(
        "Демо-данные созданы. Учётные записи:\n"
        f"  регистратор: registrar / {DEMO_REGISTRAR_PASSWORD}\n"
        f"  врачи:       {', '.join(d.login for d in DEMO_DOCTORS)} —"
        f" пароль общий: {DEMO_DOCTOR_PASSWORD}"
    )
    return True


def _create_specializations(db: Session) -> dict[str, Specialization]:
    specs = {name: Specialization(name=name) for name in DEMO_SPECIALIZATIONS}
    db.add_all(specs.values())
    return specs


def _create_rooms(db: Session, specs: dict[str, Specialization]) -> dict[str, Room]:
    """Два универсальных кабинета и один профильный УЗИ."""
    rooms = {number: Room(number=number) for number in UNIVERSAL_ROOMS}
    rooms[UZI_ROOM] = Room(number=UZI_ROOM, specialization_id=specs["УЗИ"].id)
    db.add_all(rooms.values())
    return rooms


def _create_doctors(db: Session, specs: dict[str, Specialization]) -> list[tuple[DemoDoctor, Doctor]]:
    """Найм демо-врачей: учётка + договор + недельные шаблоны графика."""
    signed = clinic_today() - timedelta(days=30)
    hired: list[tuple[DemoDoctor, Doctor]] = []
    for index, demo in enumerate(DEMO_DOCTORS, start=1):
        user = AppUser(
            full_name=demo.full_name,
            login=demo.login,
            password_hash=hash_password(DEMO_DOCTOR_PASSWORD),
            role=UserRole.doctor,
        )
        db.add(user)
        db.flush()

        doctor = Doctor(user_id=user.id, specialization_id=specs[demo.specialization].id)
        db.add(doctor)
        db.flush()

        db.add(
            Contract(
                doctor_id=doctor.id,
                number=f"Д-{index:03d}",
                signed_at=signed,
                valid_from=signed,
                status=ContractStatus.active,
            )
        )
        for weekday in demo.weekdays:
            db.add(
                ScheduleTemplate(
                    doctor_id=doctor.id,
                    weekday=weekday,
                    start_time=demo.start,
                    end_time=demo.end,
                )
            )
        hired.append((demo, doctor))
    return hired


def _create_patients(db: Session) -> list[Patient]:
    """Гражданин РФ с СНИЛС, иностранец со страховкой и ещё один пациент РФ."""
    patients = [
        Patient(
            snils="11223344595",
            full_name="Петров Иван Николаевич",
            birth_date=date(1985, 3, 12),
            citizenship="RUS",
            phone="+7 912 345-67-89",
        ),
        Patient(
            full_name="Каримов Али",
            birth_date=date(1993, 7, 19),
            citizenship="UZB",
            insurance_policy="UZ-774421",
            insurance_company="Uzbekinvest International",
            phone="+7 921 111-22-33",
        ),
        Patient(
            snils="55667788900",
            full_name="Соловьёва Мария Андреевна",
            birth_date=date(1978, 11, 30),
            citizenship="RUS",
            phone="+7 903 555-66-77",
        ),
    ]
    db.add_all(patients)
    return patients


def _create_today_queue(
    db: Session,
    rooms: dict[str, Room],
    doctors: list[tuple[DemoDoctor, Doctor]],
    patients: list[Patient],
) -> None:
    """Закрепить работающих сегодня врачей за кабинетами и выдать талоны,
    чтобы табло и экран врача сразу показывали живую очередь."""
    today = clinic_today()
    weekday = today.weekday()

    # УЗИ-врач — только в профильный кабинет, остальные — в универсальные
    assignments: list[tuple[Doctor, Room]] = []
    taken_rooms: set[int] = set()
    for demo, doctor in doctors:
        if weekday not in demo.weekdays:
            continue
        candidates = [rooms[UZI_ROOM]] if demo.specialization == "УЗИ" else [
            rooms[number] for number in UNIVERSAL_ROOMS
        ]
        room = next((r for r in candidates if r.id not in taken_rooms), None)
        if room is None:
            continue
        taken_rooms.add(room.id)
        assignments.append((doctor, room))

    # первому кабинету — очередь поживее: один номер уже вызван
    statuses_by_room = (
        (TicketStatus.called, TicketStatus.waiting, TicketStatus.waiting),
        (TicketStatus.waiting, TicketStatus.waiting),
    )
    number = 0
    for room_index, (doctor, room) in enumerate(assignments):
        workday = DoctorWorkday(
            doctor_id=doctor.id,
            room_id=room.id,
            work_date=today,
            started_at=clinic_now(),
        )
        db.add(workday)
        db.flush()
        statuses = statuses_by_room[min(room_index, len(statuses_by_room) - 1)]
        for status in statuses:
            number += 1
            db.add(
                Ticket(
                    ticket_date=today,
                    number=number,
                    patient_id=patients[number % len(patients)].id,
                    doctor_workday_id=workday.id,
                    status=status,
                )
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Наполнение базы данных клиники")
    parser.add_argument("login", nargs="?", default="admin", help="логин первого админа")
    parser.add_argument("password", nargs="?", default="admin", help="пароль первого админа")
    parser.add_argument("--demo", action="store_true", help="создать демо-данные для показа")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        ensure_admin(db, args.login, args.password)
        if args.demo:
            seed_demo(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
