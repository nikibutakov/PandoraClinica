"""Публичный API внешнего сайта: без аутентификации, без данных пациентов."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CallbackRequest, CallbackStatus
from app.schemas import CallbackCreate, CallbackOut

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
