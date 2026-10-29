"""Блок врача: мой день, очередь, вызов пациента, приём, направления."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AppUser,
    Appointment,
    AppointmentStatus,
    Diagnosis,
    Doctor,
    DoctorWorkday,
    MedicalRecord,
    MedicalRecordDiagnosis,
    Patient,
    Referral,
    ReferralStatus,
    Room,
    Slot,
    Specialization,
    Ticket,
    TicketStatus,
    UserRole,
)
from app.schemas import (
    QueueCounts,
    QueueItemOut,
    ReferralCreate,
    ReferralOut,
    TodayOut,
    TicketOut,
    VisitIn,
    VisitOut,
)
from app.security import require_role
from app.utils import clinic_today

router = APIRouter()


def get_current_doctor(
    user: AppUser = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
) -> Doctor:
    doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if doctor is None or not doctor.is_active:
        raise HTTPException(403, "Профиль врача не найден или отключён")
    return doctor


def _my_workday(db: Session, doctor: Doctor, d: date) -> DoctorWorkday | None:
    return db.scalar(
        select(DoctorWorkday).where(
            DoctorWorkday.doctor_id == doctor.id,
            DoctorWorkday.work_date == d,
        )
    )


@router.get(
    "/me/today",
    response_model=TodayOut,
    summary="Мой день: кабинет и счётчики очереди",
    tags=["Врач · Смена и очередь"],
)
def my_today(
    date_: date | None = Query(None, alias="date", description="по умолчанию сегодня"),
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    d = date_ or clinic_today()
    workday = _my_workday(db, doctor, d)
    room = db.get(Room, workday.room_id) if workday else None

    counts = QueueCounts()
    if workday:
        for ticket in db.scalars(select(Ticket).where(Ticket.doctor_workday_id == workday.id)):
            setattr(counts, ticket.status.value, getattr(counts, ticket.status.value) + 1)

    return TodayOut(
        date=d,
        workday_id=workday.id if workday else None,
        room_id=room.id if room else None,
        room_number=room.number if room else None,
        queue=counts,
    )


@router.get(
    "/queue",
    response_model=list[QueueItemOut],
    summary="Моя очередь талонов",
    tags=["Врач · Смена и очередь"],
)
def my_queue(
    date_: date | None = Query(None, alias="date", description="по умолчанию сегодня"),
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    d = date_ or clinic_today()
    workday = _my_workday(db, doctor, d)
    if workday is None:
        return []

    rows = db.execute(
        select(Ticket, Patient, Appointment)
        .join(Patient, Patient.id == Ticket.patient_id)
        .join(Appointment, Appointment.id == Ticket.appointment_id, isouter=True)
        .where(Ticket.doctor_workday_id == workday.id)
        .order_by(Ticket.number)
    ).all()

    # время записи — из слота appointment
    slot_starts = {}
    appointment_ids = [appt.id for _, _, appt in rows if appt]
    if appointment_ids:
        slot_rows = db.execute(
            select(Appointment.id, Slot.starts_at)
            .join(Slot, Slot.id == Appointment.slot_id)
            .where(Appointment.id.in_(appointment_ids))
        ).all()
        slot_starts = dict(slot_rows)

    return [
        QueueItemOut(
            id=ticket.id,
            number=ticket.number,
            status=ticket.status,
            patient_id=patient.id,
            patient_name=patient.full_name,
            appointment_starts_at=slot_starts.get(appointment.id) if appointment else None,
        )
        for ticket, patient, appointment in rows
    ]


def _ticket_or_403(db: Session, doctor: Doctor, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Талон не найден")
    if ticket.doctor_workday_id is None:
        raise HTTPException(400, "Талон не привязан к рабочему дню врача")
    workday = db.get(DoctorWorkday, ticket.doctor_workday_id)
    if workday is None or workday.doctor_id != doctor.id:
        raise HTTPException(403, "Талон принадлежит другому врачу")
    return ticket


@router.post(
    "/queue/{ticket_id}/call",
    response_model=TicketOut,
    summary="Вызвать пациента",
    tags=["Врач · Смена и очередь"],
)
def call_patient(ticket_id: int, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Вызвать следующего пациента — статус попадает на табло."""
    ticket = _ticket_or_403(db, doctor, ticket_id)
    if ticket.status != TicketStatus.waiting:
        raise HTTPException(409, f"Талон в статусе {ticket.status.value}, вызвать можно только ожидающего")
    ticket.status = TicketStatus.called
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post(
    "/queue/{ticket_id}/skip",
    response_model=TicketOut,
    summary="Пациент не дождался",
    tags=["Врач · Смена и очередь"],
)
def skip_patient(ticket_id: int, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Пациент не дождался или ушёл."""
    ticket = _ticket_or_403(db, doctor, ticket_id)
    if ticket.status not in (TicketStatus.waiting, TicketStatus.called):
        raise HTTPException(409, f"Талон в статусе {ticket.status.value}")
    ticket.status = TicketStatus.skipped
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post(
    "/visits",
    response_model=VisitOut,
    status_code=201,
    summary="Завершить приём: медзапись, диагнозы, направление",
    tags=["Врач · Приём и направления"],
)
def complete_visit(data: VisitIn, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Завершить приём: запись в медкарте, диагнозы, при необходимости направление."""
    ticket = _ticket_or_403(db, doctor, data.ticket_id)
    if ticket.status not in (TicketStatus.waiting, TicketStatus.called):
        raise HTTPException(409, f"Приём по талону уже проведён (статус {ticket.status.value})")

    appointment = db.get(Appointment, ticket.appointment_id) if ticket.appointment_id else None

    # диагнозы: из справочника по id или по коду МКБ (новый создаётся)
    diagnoses: list[tuple[Diagnosis, bool]] = []
    for item in data.diagnoses:
        if item.diagnosis_id:
            diagnosis = db.get(Diagnosis, item.diagnosis_id)
            if diagnosis is None:
                raise HTTPException(404, f"Диагноз #{item.diagnosis_id} не найден")
        elif item.code:
            diagnosis = db.scalar(select(Diagnosis).where(Diagnosis.code == item.code))
            if diagnosis is None:
                if not item.name:
                    raise HTTPException(400, f"Для нового диагноза {item.code} укажите название")
                diagnosis = Diagnosis(code=item.code, name=item.name)
                db.add(diagnosis)
                db.flush()
        else:
            raise HTTPException(400, "У каждого диагноза нужен diagnosis_id или код МКБ")
        diagnoses.append((diagnosis, item.is_primary))
    if diagnoses and not any(is_primary for _, is_primary in diagnoses):
        diagnoses[0] = (diagnoses[0][0], True)  # первый назначается основным

    record = MedicalRecord(
        appointment_id=appointment.id if appointment else None,
        ticket_id=ticket.id,
        patient_id=ticket.patient_id,
        doctor_id=doctor.id,
        complaints=data.complaints,
        anamnesis=data.anamnesis,
        treatment=data.treatment,
    )
    db.add(record)
    db.flush()

    for diagnosis, is_primary in diagnoses:
        db.add(
            MedicalRecordDiagnosis(
                medical_record_id=record.id,
                diagnosis_id=diagnosis.id,
                is_primary=is_primary,
            )
        )

    referral = None
    if data.referral:
        if db.get(Specialization, data.referral.to_specialization_id) is None:
            raise HTTPException(404, "Специальность направления не найдена")
        referral = Referral(
            patient_id=ticket.patient_id,
            from_doctor_id=doctor.id,
            to_specialization_id=data.referral.to_specialization_id,
            reason=data.referral.reason,
            status=ReferralStatus.active,
        )
        db.add(referral)

    ticket.status = TicketStatus.done
    if appointment:
        appointment.status = AppointmentStatus.completed

    db.commit()
    db.refresh(record)
    return record


@router.post(
    "/referrals",
    response_model=ReferralOut,
    status_code=201,
    summary="Выдать направление к специальности",
    tags=["Врач · Приём и направления"],
)
def create_referral(data: ReferralCreate, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Направление к специальности вне приёма (например, по телефону из кабинета)."""
    if db.get(Patient, data.patient_id) is None:
        raise HTTPException(404, "Пациент не найден")
    if db.get(Specialization, data.to_specialization_id) is None:
        raise HTTPException(404, "Специальность не найдена")
    referral = Referral(
        patient_id=data.patient_id,
        from_doctor_id=doctor.id,
        to_specialization_id=data.to_specialization_id,
        reason=data.reason,
        status=ReferralStatus.active,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral
