"""Вход в систему."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppUser
from app.schemas import LoginIn, TokenOut
from app.security import create_access_token, verify_password

router = APIRouter()


@router.post("/login", response_model=TokenOut, summary="Войти и получить JWT-токен", tags=["Аутентификация"])
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(AppUser).where(AppUser.login == data.login))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Учётная запись отключена")
    return TokenOut(
        access_token=create_access_token(user),
        role=user.role,
        full_name=user.full_name,
    )
