"""Табло очереди для ТВ: публичный read-only эндпоинт по статусам талонов."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AppUser,
    Doctor,
    DoctorWorkday,
    Room,
    Specialization,
    Ticket,
    TicketStatus,
)
from app.schemas import BoardOut, BoardRoom, BoardTicket
from app.utils import clinic_today

router = APIRouter()


@router.get("", response_model=BoardOut)
def board(
    date_: date | None = Query(None, alias="date", description="по умолчанию сегодня"),
    db: Session = Depends(get_db),
):
    """Кто в каком кабинете принимает, кого вызвали, кто ждёт."""
    d = date_ or clinic_today()

    rows = db.execute(
        select(DoctorWorkday, Doctor, AppUser, Specialization, Room)
        .join(Doctor, Doctor.id == DoctorWorkday.doctor_id)
        .join(AppUser, AppUser.id == Doctor.user_id, isouter=True)
        .join(Specialization, Specialization.id == Doctor.specialization_id, isouter=True)
        .join(Room, Room.id == DoctorWorkday.room_id)
        .where(DoctorWorkday.work_date == d)
        .order_by(Room.number)
    ).all()

    tickets_by_workday: dict[int, list[Ticket]] = {}
    workday_ids = [workday.id for workday, *_ in rows]
    if workday_ids:
        for ticket in db.scalars(
            select(Ticket)
            .where(Ticket.doctor_workday_id.in_(workday_ids))
            .order_by(Ticket.number)
        ):
            tickets_by_workday.setdefault(ticket.doctor_workday_id, []).append(ticket)

    rooms = []
    for workday, doctor, user, spec, room in rows:
        day_tickets = tickets_by_workday.get(workday.id, [])
        rooms.append(
            BoardRoom(
                workday_id=workday.id,
                room_id=room.id,
                room_number=room.number,
                doctor_id=doctor.id,
                doctor_name=user.full_name if user else None,
                specialization_name=spec.name if spec else None,
                current=[
                    BoardTicket(number=ticket.number, status=ticket.status)
                    for ticket in day_tickets
                    if ticket.status in (TicketStatus.called, TicketStatus.in_progress)
                ],
                waiting_numbers=[
                    ticket.number for ticket in day_tickets
                    if ticket.status == TicketStatus.waiting
                ],
            )
        )
    return BoardOut(date=d, rooms=rooms)
