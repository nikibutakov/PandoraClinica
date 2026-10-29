"""Pydantic-схемы запросов и ответов API."""

import re
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import (
    AppointmentStatus,
    CallbackStatus,
    ContractStatus,
    ReferralStatus,
    SlotStatus,
    TicketStatus,
    UserRole,
)

# --------------------------------------------------------------------------- #
# Аутентификация и пользователи
# --------------------------------------------------------------------------- #


class LoginIn(BaseModel):
    login: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    login: str
    role: UserRole
    is_active: bool


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=4, max_length=72)
    role: UserRole  # admin | registrar; врачи нанимаются через /api/admin/doctors


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    login: str | None = Field(default=None, min_length=3, max_length=100)
    password: str | None = Field(default=None, min_length=4, max_length=72)
    is_active: bool | None = None


# --------------------------------------------------------------------------- #
# Справочники: специальности и кабинеты
# --------------------------------------------------------------------------- #


class SpecializationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class SpecializationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class RoomCreate(BaseModel):
    number: str = Field(min_length=1, max_length=10)
    specialization_id: int | None = None  # NULL — универсальный кабинет


class RoomUpdate(BaseModel):
    number: str | None = Field(default=None, min_length=1, max_length=10)
    specialization_id: int | None = None


class RoomOut(BaseModel):
    id: int
    number: str
    specialization_id: int | None
    specialization_name: str | None


# --------------------------------------------------------------------------- #
# Врачи: найм, договор, график
# --------------------------------------------------------------------------- #


class DoctorHireIn(BaseModel):
    """Устройство врача на работу: учётка + профиль + договор одной операцией."""

    full_name: str = Field(min_length=2, max_length=200)
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=4, max_length=72)
    specialization_id: int

    contract_number: str = Field(min_length=1, max_length=50)
    signed_at: date | None = None  # по умолчанию сегодня
    valid_from: date
    valid_to: date | None = None  # NULL — бессрочный


class DoctorUpdate(BaseModel):
    is_active: bool | None = None
    specialization_id: int | None = None


class ContractOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    signed_at: date
    valid_from: date
    valid_to: date | None
    status: ContractStatus


class DoctorOut(BaseModel):
    id: int
    full_name: str | None
    login: str | None
    specialization_id: int
    specialization_name: str | None
    is_active: bool
    contract: ContractOut | None


class ScheduleWindow(BaseModel):
    start_time: time
    end_time: time


class ScheduleTemplateIn(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 — понедельник … 6 — воскресенье")
    start_time: time
    end_time: time


class ScheduleTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    weekday: int
    start_time: time
    end_time: time
    is_active: bool


class ScheduleIn(BaseModel):
    """PUT полностью заменяет набор шаблонов врача."""

    items: list[ScheduleTemplateIn]


class SlotOut(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str | None
    specialization_id: int | None
    starts_at: datetime
    ends_at: datetime
    status: SlotStatus


# --------------------------------------------------------------------------- #
# Регистратура: утро, пациенты, запись, талоны, направления
# --------------------------------------------------------------------------- #


class WorkdayCreate(BaseModel):
    doctor_id: int
    room_id: int
    work_date: date | None = None  # по умолчанию сегодня по клинике


class WorkdayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    room_id: int
    work_date: date
    started_at: datetime | None
    finished_at: datetime | None


class MorningDoctor(BaseModel):
    doctor_id: int
    full_name: str
    specialization_id: int
    specialization_name: str
    windows: list[ScheduleWindow]


class MorningOccupied(BaseModel):
    workday_id: int
    doctor_id: int
    full_name: str | None
    specialization_name: str | None
    room_id: int
    room_number: str
    started_at: datetime | None


class MorningOut(BaseModel):
    date: date
    expected: list[MorningDoctor]
    occupied: list[MorningOccupied]
    free_rooms: list[RoomOut]


class PatientCreate(BaseModel):
    snils: str | None = Field(default=None, pattern=r"^\d{11}$")
    full_name: str | None = Field(default=None, max_length=200)
    birth_date: date | None = None
    citizenship: str = Field(default="RUS", min_length=3, max_length=3)
    insurance_policy: str | None = Field(default=None, max_length=50)
    insurance_company: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=20)


class PatientUpdate(BaseModel):
    """Дозаполнение данных (например, личность установили после приёма без СНИЛС)."""

    snils: str | None = Field(default=None, pattern=r"^\d{11}$")
    full_name: str | None = Field(default=None, max_length=200)
    birth_date: date | None = None
    insurance_policy: str | None = Field(default=None, max_length=50)
    insurance_company: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=20)


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snils: str | None
    full_name: str | None
    birth_date: date | None
    citizenship: str
    insurance_policy: str | None
    insurance_company: str | None
    phone: str | None


class AppointmentCreate(BaseModel):
    slot_id: int
    patient_id: int
    referral_id: int | None = None  # запись по направлению — закроет его


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slot_id: int
    patient_id: int
    status: AppointmentStatus
    created_at: datetime


class TicketCreate(BaseModel):
    patient_id: int
    doctor_workday_id: int | None = None
    appointment_id: int | None = None  # по нему определится врач/день, если кабинет не указан


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_date: date
    number: int
    patient_id: int
    doctor_workday_id: int | None
    appointment_id: int | None
    status: TicketStatus
    created_at: datetime


class ReferralOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    from_doctor_id: int
    to_specialization_id: int
    reason: str | None
    status: ReferralStatus
    created_at: datetime


class ReferralStatusIn(BaseModel):
    status: ReferralStatus


# --------------------------------------------------------------------------- #
# Внешний сайт: заявки на перезвон и публичный график
# --------------------------------------------------------------------------- #


class CallbackCreate(BaseModel):
    phone: str
    full_name: str | None = Field(default=None, max_length=200)
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        # цифры, скобки, пробелы, дефисы, ведущий «+»; минимум 7 цифр
        if not re.fullmatch(r"\+?[0-9()\-\s]{7,20}", value) or sum(ch.isdigit() for ch in value) < 7:
            raise ValueError("Телефон: 7–20 символов (цифры, скобки, пробелы, дефисы, ведущий +), минимум 7 цифр")
        return value


class CallbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    full_name: str | None
    comment: str | None
    status: CallbackStatus
    created_at: datetime


class CallbackStatusIn(BaseModel):
    status: CallbackStatus


class PublicSlotOut(BaseModel):
    """Слот публичного графика: только специальность и время, без врача."""

    specialization_id: int
    specialization_name: str
    starts_at: datetime
    ends_at: datetime


# --------------------------------------------------------------------------- #
# Табло (ТВ)
# --------------------------------------------------------------------------- #


class BoardTicket(BaseModel):
    number: int
    status: TicketStatus  # called | in_progress


class BoardRoom(BaseModel):
    workday_id: int
    room_id: int
    room_number: str
    doctor_id: int
    doctor_name: str | None
    specialization_name: str | None
    current: list[BoardTicket] = []  # вызванные / на приёме
    waiting_numbers: list[int] = []  # ожидающие, по возрастанию номера


class BoardOut(BaseModel):
    date: date
    rooms: list[BoardRoom]


# --------------------------------------------------------------------------- #
# Вечерняя выгрузка приёмов (раздельно РФ / не-РФ)
# --------------------------------------------------------------------------- #


class ExportPatient(BaseModel):
    id: int
    snils: str | None
    full_name: str | None
    citizenship: str
    insurance_policy: str | None
    insurance_company: str | None


class ExportDiagnosis(BaseModel):
    code: str
    name: str
    is_primary: bool


class ExportVisit(BaseModel):
    medical_record_id: int
    ticket_id: int
    ticket_number: int
    patient: ExportPatient
    doctor_name: str | None
    specialization_name: str | None
    diagnoses: list[ExportDiagnosis] = []
    created_at: datetime


class ExportGroup(BaseModel):
    total: int
    visits: list[ExportVisit] = []


class DailyExportOut(BaseModel):
    date: date
    ru: ExportGroup = Field(description="Граждане РФ (citizenship == RUS)")
    foreign: ExportGroup = Field(description="Иностранные граждане (остальные)")


# --------------------------------------------------------------------------- #
# Врач: день, очередь, приём
# --------------------------------------------------------------------------- #


class QueueCounts(BaseModel):
    waiting: int = 0
    called: int = 0
    in_progress: int = 0
    done: int = 0
    skipped: int = 0


class TodayOut(BaseModel):
    date: date
    workday_id: int | None
    room_id: int | None
    room_number: str | None
    queue: QueueCounts


class QueueItemOut(BaseModel):
    id: int
    number: int
    status: TicketStatus
    patient_id: int
    patient_name: str | None
    appointment_starts_at: datetime | None


class DiagnosisItem(BaseModel):
    """Готовый диагноз из справочника (diagnosis_id) или новый по коду МКБ-10."""

    diagnosis_id: int | None = None
    code: str | None = Field(default=None, max_length=10)
    name: str | None = Field(default=None, max_length=200)
    is_primary: bool = False


class VisitReferralIn(BaseModel):
    """Направление, создаваемое сразу по итогам приёма (пациент берётся из талона)."""

    to_specialization_id: int
    reason: str | None = None


class VisitIn(BaseModel):
    ticket_id: int
    complaints: str | None = None
    anamnesis: str | None = None
    treatment: str | None = None  # назначения и рекомендации текстом
    diagnoses: list[DiagnosisItem] = []
    referral: VisitReferralIn | None = None


class VisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int | None
    appointment_id: int | None
    patient_id: int
    doctor_id: int
    complaints: str | None
    anamnesis: str | None
    treatment: str | None
    created_at: datetime


class ReferralCreate(BaseModel):
    patient_id: int
    to_specialization_id: int
    reason: str | None = None
