"""Блок администратора: персонал, справочники, найм врачей, график, слоты."""

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    AppUser,
    Contract,
    ContractStatus,
    Diagnosis,
    Doctor,
    MedicalRecord,
    MedicalRecordDiagnosis,
    Patient,
    Room,
    ScheduleTemplate,
    Slot,
    SlotStatus,
    Specialization,
    Ticket,
    UserRole,
)
from app.schemas import (
    ContractOut,
    DailyExportOut,
    DoctorHireIn,
    DoctorOut,
    DoctorUpdate,
    ExportDiagnosis,
    ExportGroup,
    ExportPatient,
    ExportVisit,
    RoomCreate,
    RoomOut,
    RoomUpdate,
    ScheduleIn,
    ScheduleTemplateOut,
    SlotOut,
    SpecializationCreate,
    SpecializationOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.security import hash_password, require_role
from app.utils import clinic_now, clinic_today, clinic_tz, day_bounds

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])


# --------------------------------------------------------------------------- #
# Пользователи (регистраторы и админы; врачи — через /doctors)
# --------------------------------------------------------------------------- #


@router.get(
    "/users",
    response_model=list[UserOut],
    summary="Список сотрудников",
    tags=["Админ · Персонал"],
)
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(AppUser).order_by(AppUser.id)).all()


@router.post(
    "/users",
    response_model=UserOut,
    status_code=201,
    summary="Создать учётку регистратора или админа",
    tags=["Админ · Персонал"],
)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if data.role == UserRole.doctor:
        raise HTTPException(400, "Врачи нанимаются через POST /api/admin/doctors")
    if db.scalar(select(AppUser).where(AppUser.login == data.login)):
        raise HTTPException(409, "Логин уже занят")
    user = AppUser(
        full_name=data.full_name,
        login=data.login,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Изменить учётку (пароль, ФИО, деактивация)",
    tags=["Админ · Персонал"],
)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(AppUser, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")

    if data.login and data.login != user.login:
        if db.scalar(select(AppUser).where(AppUser.login == data.login)):
            raise HTTPException(409, "Логин уже занят")
        user.login = data.login
    if data.full_name:
        user.full_name = data.full_name
    if data.password:
        user.password_hash = hash_password(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return user


# --------------------------------------------------------------------------- #
# Специальности
# --------------------------------------------------------------------------- #


@router.get(
    "/specializations",
    response_model=list[SpecializationOut],
    summary="Список специальностей",
    tags=["Админ · Справочники"],
)
def list_specializations(db: Session = Depends(get_db)):
    return db.scalars(select(Specialization).order_by(Specialization.name)).all()


@router.post(
    "/specializations",
    response_model=SpecializationOut,
    status_code=201,
    summary="Добавить специальность",
    tags=["Админ · Справочники"],
)
def create_specialization(data: SpecializationCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Specialization).where(Specialization.name == data.name)):
        raise HTTPException(409, "Такая специальность уже есть")
    spec = Specialization(name=data.name)
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec


# --------------------------------------------------------------------------- #
# Кабинеты
# --------------------------------------------------------------------------- #


def _room_out(room: Room, spec: Specialization | None) -> RoomOut:
    return RoomOut(
        id=room.id,
        number=room.number,
        specialization_id=room.specialization_id,
        specialization_name=spec.name if spec else None,
    )


@router.get(
    "/rooms",
    response_model=list[RoomOut],
    summary="Список кабинетов",
    tags=["Админ · Справочники"],
)
def list_rooms(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Room, Specialization)
        .join(Specialization, Room.specialization_id == Specialization.id, isouter=True)
        .order_by(Room.number)
    ).all()
    return [_room_out(room, spec) for room, spec in rows]


@router.post(
    "/rooms",
    response_model=RoomOut,
    status_code=201,
    summary="Добавить кабинет",
    tags=["Админ · Справочники"],
)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Room).where(Room.number == data.number)):
        raise HTTPException(409, "Кабинет с таким номером уже есть")
    if data.specialization_id and db.get(Specialization, data.specialization_id) is None:
        raise HTTPException(404, "Специальность не найдена")
    room = Room(number=data.number, specialization_id=data.specialization_id)
    db.add(room)
    db.commit()
    db.refresh(room)
    return _room_out(room, db.get(Specialization, room.specialization_id) if room.specialization_id else None)


@router.patch(
    "/rooms/{room_id}",
    response_model=RoomOut,
    summary="Изменить кабинет",
    tags=["Админ · Справочники"],
)
def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(404, "Кабинет не найден")
    if data.number and data.number != room.number:
        if db.scalar(select(Room).where(Room.number == data.number)):
            raise HTTPException(409, "Кабинет с таким номером уже есть")
        room.number = data.number
    if data.specialization_id is not None:
        if data.specialization_id and db.get(Specialization, data.specialization_id) is None:
            raise HTTPException(404, "Специальность не найдена")
        room.specialization_id = data.specialization_id or None
    db.commit()
    db.refresh(room)
    return _room_out(room, db.get(Specialization, room.specialization_id) if room.specialization_id else None)


# --------------------------------------------------------------------------- #
# Врачи: найм (учётка + профиль + договор) и график
# --------------------------------------------------------------------------- #


def _doctor_out(db: Session, doctor: Doctor, contract: Contract | None) -> DoctorOut:
    user = db.get(AppUser, doctor.user_id) if doctor.user_id else None
    spec = db.get(Specialization, doctor.specialization_id)
    return DoctorOut(
        id=doctor.id,
        full_name=user.full_name if user else None,
        login=user.login if user else None,
        specialization_id=doctor.specialization_id,
        specialization_name=spec.name if spec else None,
        is_active=doctor.is_active,
        contract=ContractOut.model_validate(contract) if contract else None,
    )


@router.get(
    "/doctors",
    response_model=list[DoctorOut],
    summary="Список врачей с договорами",
    tags=["Админ · Врачи и график"],
)
def list_doctors(db: Session = Depends(get_db)):
    doctors = db.scalars(select(Doctor).order_by(Doctor.id)).all()
    contracts: dict[int, Contract] = {}
    for contract in db.scalars(select(Contract).order_by(Contract.id)):
        contracts[contract.doctor_id] = contract
    return [_doctor_out(db, doctor, contracts.get(doctor.id)) for doctor in doctors]


@router.post(
    "/doctors",
    response_model=DoctorOut,
    status_code=201,
    summary="Нанять врача: учётка + профиль + договор",
    tags=["Админ · Врачи и график"],
)
def hire_doctor(data: DoctorHireIn, db: Session = Depends(get_db)):
    """Устройство на работу: учётка + врач + договор одной транзакцией."""
    if db.get(Specialization, data.specialization_id) is None:
        raise HTTPException(404, "Специальность не найдена")
    if db.scalar(select(AppUser).where(AppUser.login == data.login)):
        raise HTTPException(409, "Логин уже занят")
    if db.scalar(select(Contract).where(Contract.number == data.contract_number)):
        raise HTTPException(409, "Договор с таким номером уже есть")

    user = AppUser(
        full_name=data.full_name,
        login=data.login,
        password_hash=hash_password(data.password),
        role=UserRole.doctor,
    )
    db.add(user)
    db.flush()

    doctor = Doctor(user_id=user.id, specialization_id=data.specialization_id)
    db.add(doctor)
    db.flush()

    contract = Contract(
        doctor_id=doctor.id,
        number=data.contract_number,
        signed_at=data.signed_at or clinic_now().date(),
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        status=ContractStatus.active,
    )
    db.add(contract)
    db.commit()
    db.refresh(doctor)
    return _doctor_out(db, doctor, contract)


@router.patch(
    "/doctors/{doctor_id}",
    response_model=DoctorOut,
    summary="Изменить врача (специальность, деактивация)",
    tags=["Админ · Врачи и график"],
)
def update_doctor(doctor_id: int, data: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(404, "Врач не найден")
    if data.specialization_id is not None:
        if db.get(Specialization, data.specialization_id) is None:
            raise HTTPException(404, "Специальность не найдена")
        doctor.specialization_id = data.specialization_id
    if data.is_active is not None:
        doctor.is_active = data.is_active
    db.commit()
    db.refresh(doctor)
    latest = db.scalar(
        select(Contract).where(Contract.doctor_id == doctor.id).order_by(Contract.id.desc())
    )
    return _doctor_out(db, doctor, latest)


@router.get(
    "/doctors/{doctor_id}/schedule",
    response_model=list[ScheduleTemplateOut],
    summary="Посмотреть недельный график врача",
    tags=["Админ · Врачи и график"],
)
def get_schedule(doctor_id: int, db: Session = Depends(get_db)):
    if db.get(Doctor, doctor_id) is None:
        raise HTTPException(404, "Врач не найден")
    return db.scalars(
        select(ScheduleTemplate)
        .where(ScheduleTemplate.doctor_id == doctor_id)
        .order_by(ScheduleTemplate.weekday, ScheduleTemplate.start_time)
    ).all()


@router.put(
    "/doctors/{doctor_id}/schedule",
    response_model=list[ScheduleTemplateOut],
    summary="Полностью заменить график врача",
    tags=["Админ · Врачи и график"],
)
def put_schedule(doctor_id: int, data: ScheduleIn, db: Session = Depends(get_db)):
    """Полная замена шаблонов графика врача."""
    if db.get(Doctor, doctor_id) is None:
        raise HTTPException(404, "Врач не найден")

    items = sorted(data.items, key=lambda i: (i.weekday, i.start_time))
    for item in items:
        if item.start_time >= item.end_time:
            raise HTTPException(400, "Начало интервала не может быть позже конца")
    for prev, nxt in zip(items, items[1:]):
        if prev.weekday == nxt.weekday and nxt.start_time < prev.end_time:
            raise HTTPException(400, "Интервалы графика пересекаются")

    db.execute(delete(ScheduleTemplate).where(ScheduleTemplate.doctor_id == doctor_id))
    for item in items:
        db.add(
            ScheduleTemplate(
                doctor_id=doctor_id,
                weekday=item.weekday,
                start_time=item.start_time,
                end_time=item.end_time,
            )
        )
    db.commit()
    return get_schedule(doctor_id, db)


# --------------------------------------------------------------------------- #
# Слоты: генерация из шаблонов и контроль
# --------------------------------------------------------------------------- #


@router.post(
    "/slots/generate",
    summary="Сгенерировать слоты из шаблонов графика",
    tags=["Админ · Слоты"],
)
def generate_slots(
    date_from: date = Query(description="Дата от, включительно"),
    date_to: date = Query(description="Дата до, включительно"),
    db: Session = Depends(get_db),
):
    """Генерация слотов по активным шаблонам. Идемпотентно: существующие пропускаются."""
    if date_to < date_from:
        raise HTTPException(400, "date_to раньше date_from")
    if (date_to - date_from).days > 92:
        raise HTTPException(400, "Период больше 92 дней")

    templates = db.scalars(
        select(ScheduleTemplate).where(ScheduleTemplate.is_active)
    ).all()
    tz = clinic_tz()
    lo, _ = day_bounds(date_from)
    _, hi = day_bounds(date_to)
    existing = {
        (doctor_id, starts_at.replace(tzinfo=tz) if starts_at.tzinfo is None else starts_at)
        for doctor_id, starts_at in db.execute(
            select(Slot.doctor_id, Slot.starts_at).where(Slot.starts_at >= lo, Slot.starts_at < hi)
        ).all()
    }

    created = 0
    day = date_from
    while day <= date_to:
        for template in templates:
            if template.weekday != day.weekday():
                continue
            window_start = datetime.combine(day, template.start_time, tz)
            window_end = datetime.combine(day, template.end_time, tz)
            cursor = window_start
            while cursor + timedelta(minutes=settings.slot_minutes) <= window_end:
                slot_end = cursor + timedelta(minutes=settings.slot_minutes)
                if (template.doctor_id, cursor) not in existing:
                    db.add(
                        Slot(
                            doctor_id=template.doctor_id,
                            template_id=template.id,
                            starts_at=cursor,
                            ends_at=slot_end,
                            status=SlotStatus.free,
                        )
                    )
                    created += 1
                cursor = slot_end
        day += timedelta(days=1)

    db.commit()
    return {"created": created, "period": f"{date_from}..{date_to}"}


@router.get(
    "/slots",
    response_model=list[SlotOut],
    summary="Слоты за дату (контроль)",
    tags=["Админ · Слоты"],
)
def list_slots(
    date: date = Query(description="Какой день показать"),
    doctor_id: int | None = Query(None, description="Фильтр по врачу"),
    specialization_id: int | None = Query(None, description="Фильтр по специальности"),
    db: Session = Depends(get_db),
):
    lo, hi = day_bounds(date)
    stmt = (
        select(Slot, Doctor, AppUser)
        .join(Doctor, Slot.doctor_id == Doctor.id)
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .where(Slot.starts_at >= lo, Slot.starts_at < hi)
        .order_by(Slot.starts_at)
    )
    if doctor_id:
        stmt = stmt.where(Slot.doctor_id == doctor_id)
    if specialization_id:
        stmt = stmt.where(Doctor.specialization_id == specialization_id)

    rows = db.execute(stmt).all()
    return [
        SlotOut(
            id=slot.id,
            doctor_id=slot.doctor_id,
            doctor_name=user.full_name if user else None,
            specialization_id=doctor.specialization_id,
            starts_at=slot.starts_at,
            ends_at=slot.ends_at,
            status=slot.status,
        )
        for slot, doctor, user in rows
    ]


# --------------------------------------------------------------------------- #
# Вечерняя выгрузка
# --------------------------------------------------------------------------- #


@router.get(
    "/reports/daily",
    response_model=DailyExportOut,
    summary="Выгрузка приёмов за день: РФ и иностранцы раздельно",
    tags=["Админ · Выгрузки"],
)
def daily_export(
    date_: date | None = Query(None, alias="date", description="по умолчанию сегодня"),
    db: Session = Depends(get_db),
):
    """Выгрузка приёмов за день, раздельно по гражданам РФ и иностранным гражданам."""
    d = date_ or clinic_today()

    rows = db.execute(
        select(MedicalRecord, Ticket, Patient, Doctor, AppUser, Specialization)
        .join(Ticket, Ticket.id == MedicalRecord.ticket_id)
        .join(Patient, Patient.id == MedicalRecord.patient_id)
        .join(Doctor, Doctor.id == MedicalRecord.doctor_id)
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .join(Specialization, Specialization.id == Doctor.specialization_id, isouter=True)
        .where(Ticket.ticket_date == d)
        .order_by(Ticket.number)
    ).all()

    diagnoses_by_record: dict[int, list[ExportDiagnosis]] = {}
    record_ids = [record.id for record, *_ in rows]
    if record_ids:
        diag_rows = db.execute(
            select(MedicalRecordDiagnosis, Diagnosis)
            .join(Diagnosis, Diagnosis.id == MedicalRecordDiagnosis.diagnosis_id)
            .where(MedicalRecordDiagnosis.medical_record_id.in_(record_ids))
            .order_by(MedicalRecordDiagnosis.is_primary.desc(), Diagnosis.code)
        ).all()
        for link, diagnosis in diag_rows:
            diagnoses_by_record.setdefault(link.medical_record_id, []).append(
                ExportDiagnosis(code=diagnosis.code, name=diagnosis.name, is_primary=link.is_primary)
            )

    ru, foreign = ExportGroup(total=0), ExportGroup(total=0)
    for record, ticket, patient, doctor, user, spec in rows:
        visit = ExportVisit(
            medical_record_id=record.id,
            ticket_id=ticket.id,
            ticket_number=ticket.number,
            patient=ExportPatient(
                id=patient.id,
                snils=patient.snils,
                full_name=patient.full_name,
                citizenship=patient.citizenship,
                insurance_policy=patient.insurance_policy,
                insurance_company=patient.insurance_company,
            ),
            doctor_name=user.full_name if user else None,
            specialization_name=spec.name if spec else None,
            diagnoses=diagnoses_by_record.get(record.id, []),
            created_at=record.created_at,
        )
        group = ru if patient.citizenship == "RUS" else foreign
        group.visits.append(visit)
        group.total += 1

    return DailyExportOut(date=d, ru=ru, foreign=foreign)
