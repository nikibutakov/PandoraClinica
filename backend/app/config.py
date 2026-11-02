"""Настройки приложения. Переопределяются переменными окружения или .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    # Совпадает с docker-compose.yml; переопределяется переменной DATABASE_URL
    database_url: str = "postgresql+psycopg2://pandora:pandora@localhost:5432/pandora_clinic"

    # Секрет для JWT. В проде обязательно переопределяется переменной окружения
    secret_key: str = "dev-secret-please-override-with-env-secret-key"
    access_token_expire_minutes: int = 480  # рабочая смена

    # Длина одного слота приёма при генерации из шаблона графика
    slot_minutes: int = 30

    # Часовой пояс клиники — для «сегодня», утренней регистрации и табло
    clinic_timezone: str = "Europe/Moscow"


settings = Settings()
