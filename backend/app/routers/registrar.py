"""Блок регистратуры: утренняя регистрация врачей, пациенты, запись, талоны."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Appointment,
    AppointmentStatus,
    AppUser,
    Doctor,
    DoctorWorkday,
    Patient,
    Referral,
    ReferralStatus,
    Room,
    ScheduleTemplate,
    Slot,
    SlotStatus,
    Specialization,
    Ticket,
    TicketStatus,
    UserRole,
)
from app.schemas import (
    AppointmentCreate,
    AppointmentOut,
    MorningDoctor,
    MorningOccupied,
    MorningOut,
    PatientCreate,
    PatientOut,
    PatientUpdate,
    ReferralOut,
    ReferralStatusIn,
    ScheduleWindow,
    RoomOut,
    SlotOut,
    TicketCreate,
    TicketOut,
    WorkdayCreate,
    WorkdayOut,
)
from app.security import require_role
from app.utils import clinic_now, clinic_today, clinic_tz, day_bounds

router = APIRouter(dependencies=[Depends(require_role(UserRole.registrar, UserRole.admin))])


# --------------------------------------------------------------------------- #
# Утро: кто работает, кто где сидит, какие кабинеты свободны
# --------------------------------------------------------------------------- #


@router.get("/morning", response_model=MorningOut)
def morning(
    date_: date | None = Query(None, alias="date", description="по умолчанию сегодня"),
    db: Session = Depends(get_db),
):
    d = date_ or clinic_today()
    weekday = d.weekday()

    rows = db.execute(
        select(Doctor, ScheduleTemplate, AppUser, Specialization)
        .join(
            ScheduleTemplate,
            and_(
                ScheduleTemplate.doctor_id == Doctor.id,
                ScheduleTemplate.weekday == weekday,
                ScheduleTemplate.is_active,
            ),
        )
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .join(Specialization, Specialization.id == Doctor.specialization_id)
        .where(Doctor.is_active)
        .order_by(Doctor.id)
    ).all()

    expected: dict[int, MorningDoctor] = {}
    for doctor, template, user, spec in rows:
        item = expected.setdefault(
            doctor.id,
            MorningDoctor(
                doctor_id=doctor.id,
                full_name=user.full_name if user else f"Врач #{doctor.id}",
                specialization_id=spec.id,
                specialization_name=spec.name,
                windows=[],
            ),
        )
        item.windows.append(ScheduleWindow(start_time=template.start_time, end_time=template.end_time))

    occupied_rows = db.execute(
        select(DoctorWorkday, Doctor, AppUser, Specialization, Room)
        .join(Doctor, Doctor.id == DoctorWorkday.doctor_id)
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .join(Specialization, Specialization.id == Doctor.specialization_id, isouter=True)
        .join(Room, Room.id == DoctorWorkday.room_id)
        .where(DoctorWorkday.work_date == d)
        .order_by(Room.number)
    ).all()
    occupied = [
        MorningOccupied(
            workday_id=workday.id,
            doctor_id=doctor.id,
            full_name=user.full_name if user else None,
            specialization_name=spec.name if spec else None,
            room_id=room.id,
            room_number=room.number,
            started_at=workday.started_at,
        )
        for workday, doctor, user, spec, room in occupied_rows
    ]

    taken_rooms = {item.room_id for item in occupied}
    rooms_stmt = (
        select(Room, Specialization)
        .join(Specialization, Specialization.id == Room.specialization_id, isouter=True)
        .order_by(Room.number)
    )
    if taken_rooms:
        rooms_stmt = rooms_stmt.where(~Room.id.in_(taken_rooms))
    free_rooms = [
        RoomOut(
            id=room.id,
            number=room.number,
            specialization_id=room.specialization_id,
            specialization_name=spec.name if spec else None,
        )
        for room, spec in db.execute(rooms_stmt).all()
    ]

    return MorningOut(date=d, expected=list(expected.values()), occupied=occupied, free_rooms=free_rooms)


@router.post("/workdays", response_model=WorkdayOut, status_code=201)
def create_workday(data: WorkdayCreate, db: Session = Depends(get_db)):
    """Утренняя регистрация: врач занимает кабинет на день."""
    doctor = db.get(Doctor, data.doctor_id)
    if doctor is None:
        raise HTTPException(404, "Врач не найден")
    if not doctor.is_active:
        raise HTTPException(400, "Врач не работает в клинике")
    room = db.get(Room, data.room_id)
    if room is None:
        raise HTTPException(404, "Кабинет не найден")

    if room.specialization_id and room.specialization_id != doctor.specialization_id:
        room_spec = db.get(Specialization, room.specialization_id)
        doc_spec = db.get(Specialization, doctor.specialization_id)
        raise HTTPException(
            409,
            f"Кабинет {room.number} профильный ({room_spec.name if room_spec else '?'}), "
            f"не подходит врачу ({doc_spec.name if doc_spec else '?'})",
        )

    d = data.work_date or clinic_today()
    busy_room = db.scalar(select(DoctorWorkday).where(DoctorWorkday.work_date == d, DoctorWorkday.room_id == room.id))
    if busy_room:
        raise HTTPException(409, f"Кабинет {room.number} на {d} уже занят")
    busy_doctor = db.scalar(
        select(DoctorWorkday).where(DoctorWorkday.work_date == d, DoctorWorkday.doctor_id == doctor.id)
    )
    if busy_doctor:
        raise HTTPException(409, f"Врач на {d} уже закреплён за кабинетом")

    workday = DoctorWorkday(
        doctor_id=doctor.id,
        room_id=room.id,
        work_date=d,
        started_at=clinic_now(),
    )
    db.add(workday)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Кабинет или врач на этот день уже заняты")
    db.refresh(workday)
    return workday


# --------------------------------------------------------------------------- #
# Пациенты
# --------------------------------------------------------------------------- #


@router.get("/patients", response_model=list[PatientOut])
def search_patients(query: str = "", db: Session = Depends(get_db)):
    stmt = select(Patient)
    q = query.strip()
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Patient.snils.ilike(pattern),
                Patient.full_name.ilike(pattern),
                Patient.phone.ilike(pattern),
            )
        )
    return db.scalars(stmt.order_by(Patient.id.desc()).limit(50)).all()


@router.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    if data.snils and db.scalar(select(Patient).where(Patient.snils == data.snils)):
        raise HTTPException(409, "Пациент с таким СНИЛС уже зарегистрирован")
    if data.snils is None and data.insurance_policy is None and data.full_name:
        raise HTTPException(
            400,
            "Пациент без СНИЛС оформляется либо со сторонней страховкой, "
            "либо без ФИО (неопознанный приём, например с скорой)",
        )
    patient = Patient(
        snils=data.snils,
        full_name=data.full_name,
        birth_date=data.birth_date,
        citizenship=data.citizenship.upper(),
        insurance_policy=data.insurance_policy,
        insurance_company=data.insurance_company,
        phone=data.phone,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.patch("/patients/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, data: PatientUpdate, db: Session = Depends(get_db)):
    """Дозаполнение карточки: личность установили, появилась страховка и т.п."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(404, "Пациент не найден")
    if data.snils and data.snils != patient.snils:
        if db.scalar(select(Patient).where(Patient.snils == data.snils)):
            raise HTTPException(409, "Пациент с таким СНИЛС уже зарегистрирован")
        patient.snils = data.snils
    for field in ("full_name", "birth_date", "insurance_policy", "insurance_company", "phone"):
        value = getattr(data, field)
        if value is not None:
            setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


# --------------------------------------------------------------------------- #
# Запись на приём
# --------------------------------------------------------------------------- #


@router.get("/slots", response_model=list[SlotOut])
def free_slots(
    specialization_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """Свободные слоты по специальности — так строится график на внешнем сайте."""
    d_from = date_from or clinic_today()
    d_to = date_to or d_from
    if d_to < d_from:
        raise HTTPException(400, "date_to раньше date_from")
    lo, _ = day_bounds(d_from)
    _, hi = day_bounds(d_to)

    rows = db.execute(
        select(Slot, Doctor, AppUser)
        .join(Doctor, Doctor.id == Slot.doctor_id)
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .where(
            Slot.status == SlotStatus.free,
            Slot.starts_at >= lo,
            Slot.starts_at < hi,
            Doctor.specialization_id == specialization_id,
            Doctor.is_active,
        )
        .order_by(Slot.starts_at)
    ).all()
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


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    if db.get(Patient, data.patient_id) is None:
        raise HTTPException(404, "Пациент не найден")

    referral = None
    if data.referral_id:
        referral = db.get(Referral, data.referral_id)
        if referral is None:
            raise HTTPException(404, "Направление не найдено")
        if referral.status != ReferralStatus.active:
            raise HTTPException(409, "Направление уже использовано или отменено")
        if referral.patient_id != data.patient_id:
            raise HTTPException(400, "Направление выдано другому пациенту")

    # FOR UPDATE сериализует одновременную запись двух регистраторов на один слот
    slot = db.execute(select(Slot).where(Slot.id == data.slot_id).with_for_update()).scalar_one_or_none()
    if slot is None:
        raise HTTPException(404, "Слот не найден")
    if slot.status != SlotStatus.free:
        raise HTTPException(409, "Слот уже занят")

    slot.status = SlotStatus.booked
    appointment = Appointment(
        slot_id=slot.id,
        patient_id=data.patient_id,
        status=AppointmentStatus.planned,
    )
    db.add(appointment)
    db.flush()
    if referral:
        referral.status = ReferralStatus.used
    db.commit()
    db.refresh(appointment)
    return appointment


# --------------------------------------------------------------------------- #
# Талоны живой очереди
# --------------------------------------------------------------------------- #


@router.post("/tickets", response_model=TicketOut, status_code=201)
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    """Выдать талон: номер следующий за день, уникальность гарантирует БД."""
    if db.get(Patient, data.patient_id) is None:
        raise HTTPException(404, "Пациент не найден")

    appointment = None
    if data.appointment_id:
        appointment = db.get(Appointment, data.appointment_id)
        if appointment is None:
            raise HTTPException(404, "Запись не найдена")
        if appointment.patient_id != data.patient_id:
            raise HTTPException(400, "Запись принадлежит другому пациенту")
        if appointment.status != AppointmentStatus.planned:
            raise HTTPException(409, "Запись уже закрыта или отменена")

    workday = None
    if data.doctor_workday_id:
        workday = db.get(DoctorWorkday, data.doctor_workday_id)
        if workday is None:
            raise HTTPException(404, "Рабочий день врача не найден")
        ticket_date = workday.work_date
    elif appointment:
        # пациент по записи: врач и день берутся из слота
        slot = db.get(Slot, appointment.slot_id)
        ticket_date = slot.starts_at.astimezone(clinic_tz()).date()
        workday = db.scalar(
            select(DoctorWorkday).where(
                DoctorWorkday.doctor_id == slot.doctor_id,
                DoctorWorkday.work_date == ticket_date,
            )
        )
    else:
        ticket_date = clinic_today()

    ticket = None
    for _ in range(5):
        number = (db.scalar(select(func.max(Ticket.number)).where(Ticket.ticket_date == ticket_date)) or 0) + 1
        ticket = Ticket(
            ticket_date=ticket_date,
            number=number,
            patient_id=data.patient_id,
            doctor_workday_id=workday.id if workday else None,
            appointment_id=appointment.id if appointment else None,
            status=TicketStatus.waiting,
        )
        db.add(ticket)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()  # номер забрали конкурентно — пробуем следующий
    else:
        raise HTTPException(409, "Не удалось выдать номер, попробуйте ещё раз")
    db.refresh(ticket)
    return ticket


# --------------------------------------------------------------------------- #
# Направления
# --------------------------------------------------------------------------- #


@router.get("/referrals", response_model=list[ReferralOut])
def list_referrals(
    status: ReferralStatus = ReferralStatus.active,
    patient_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Referral).where(Referral.status == status).order_by(Referral.created_at.desc())
    if patient_id:
        stmt = stmt.where(Referral.patient_id == patient_id)
    return db.scalars(stmt.limit(200)).all()


@router.patch("/referrals/{referral_id}", response_model=ReferralOut)
def update_referral(referral_id: int, data: ReferralStatusIn, db: Session = Depends(get_db)):
    referral = db.get(Referral, referral_id)
    if referral is None:
        raise HTTPException(404, "Направление не найдено")
    referral.status = data.status
    db.commit()
    db.refresh(referral)
    return referral
