"""Пароли, JWT-токены и проверка ролей."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AppUser, UserRole

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False, description="JWT из /api/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_access_token(user: AppUser) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
    db: Session = Depends(get_db),
) -> AppUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Недействительный или просроченный токен")

    user = db.get(AppUser, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден или отключён")
    return user


def require_role(*roles: UserRole):
    """Зависимость: пускать только перечисленные роли."""

    def checker(user: AppUser = Depends(get_current_user)) -> AppUser:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        return user

    return checker
