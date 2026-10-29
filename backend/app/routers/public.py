"""Публичный API внешнего сайта: без аутентификации, без данных пациентов."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    CallbackRequest,
    CallbackStatus,
    Doctor,
    Slot,
    SlotStatus,
    Specialization,
)
from app.schemas import CallbackCreate, CallbackOut, PublicSlotOut, SpecializationOut
from app.utils import clinic_now, clinic_today, day_bounds

router = APIRouter()


@router.post("/callbacks", response_model=CallbackOut, status_code=201)
def create_callback(data: CallbackCreate, db: Session = Depends(get_db)):
    """Заявка на перезвон с внешнего сайта."""
    callback = CallbackRequest(
        phone=data.phone,
        full_name=data.full_name,
        comment=data.comment,
        status=CallbackStatus.new,
    )
    db.add(callback)
    db.commit()
    db.refresh(callback)
    return callback


@router.get("/specializations", response_model=list[SpecializationOut])
def list_specializations(db: Session = Depends(get_db)):
    """Справочник специальностей для графика приёмов на внешнем сайте."""
    return db.scalars(select(Specialization).order_by(Specialization.name)).all()


@router.get("/schedule", response_model=list[PublicSlotOut])
def free_slots(
    specialization_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """Свободные слоты по специальности — график приёмов, врачи не раскрываются."""
    d_from = date_from or clinic_today()
    d_to = date_to or d_from
    if d_to < d_from:
        raise HTTPException(400, "date_to раньше date_from")
    if (d_to - d_from).days > 92:
        raise HTTPException(400, "Период больше 92 дней")
    lo, _ = day_bounds(d_from)
    _, hi = day_bounds(d_to)

    rows = db.execute(
        select(Slot, Specialization)
        .join(Doctor, Doctor.id == Slot.doctor_id)
        .join(Specialization, Specialization.id == Doctor.specialization_id)
        .where(
            Slot.status == SlotStatus.free,
            Slot.starts_at >= lo,
            Slot.starts_at < hi,
            Slot.starts_at >= clinic_now(),
            Doctor.specialization_id == specialization_id,
            Doctor.is_active,
        )
        .order_by(Slot.starts_at)
    ).all()
    return [
        PublicSlotOut(
            specialization_id=spec.id,
            specialization_name=spec.name,
            starts_at=slot.starts_at,
            ends_at=slot.ends_at,
        )
        for slot, spec in rows
    ]
