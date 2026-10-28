"""Черновик схемы БД поликлиники (SQLAlchemy 2.x, PostgreSQL).

Принципы:
- одна таблица — одна сущность из AGENTS.md, колонки минимальные;
- ORM-связи (relationship) сознательно не описаны — добавим вместе с кодом API;
- идентификаторы и значения — на английском, комментарии — на русском
  (видны в DBeaver у таблиц и колонок).

Отложено (обсуждено, но пока не моделируем): детальный профиль врача,
генерация слотов из шаблонов, проверка «тип кабинета == тип приёма»
на уровне БД.
"""

import enum
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# --------------------------------------------------------------------------- #
# Перечисления
# --------------------------------------------------------------------------- #


class UserRole(enum.Enum):
    """Роль сотрудника. Пациенты учётных записей не имеют."""

    admin = "admin"  # администратор
    registrar = "registrar"  # регистратор
    doctor = "doctor"  # врач


class ContractStatus(enum.Enum):
    active = "active"  # действует
    terminated = "terminated"  # расторгнут
    expired = "expired"  # истёк


class SlotStatus(enum.Enum):
    free = "free"  # свободен, доступен для записи
    booked = "booked"  # занят записью
    blocked = "blocked"  # снят с записи (отпуск, замена)


class AppointmentStatus(enum.Enum):
    planned = "planned"  # записан
    completed = "completed"  # принят
    cancelled = "cancelled"  # отменил запись
    no_show = "no_show"  # не пришёл


class TicketStatus(enum.Enum):
    """Статус талона живой очереди (то, что выводится на табло)."""

    waiting = "waiting"  # в очереди
    called = "called"  # вызван к врачу
    in_progress = "in_progress"  # на приёме
    done = "done"  # приём завершён
    skipped = "skipped"  # не дождался / ушёл


class ReferralStatus(enum.Enum):
    active = "active"  # действующее
    used = "used"  # использовано (пациент записан)
    cancelled = "cancelled"  # отменено


class CallbackStatus(enum.Enum):
    new = "new"  # новая заявка
    in_progress = "in_progress"  # обрабатывается
    done = "done"  # обработана


# --------------------------------------------------------------------------- #
# Персонал и справочники
# --------------------------------------------------------------------------- #


class AppUser(Base):
    """Учётная запись сотрудника поликлиники."""

    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), comment="ФИО")
    login: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Specialization(Base):
    """Специальность врача («Терапия», «УЗИ», «Хирургия»…)."""

    __tablename__ = "specialization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Doctor(Base):
    """Врач."""

    __tablename__ = "doctor"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("app_user.id"),
        unique=True,
        comment="Учётная запись для входа в систему; NULL — пока не заведена",
    )
    specialization_id: Mapped[int] = mapped_column(ForeignKey("specialization.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Room(Base):
    """Кабинет. Заполненная specialization_id — узкопрофильный кабинет
    (например, УЗИ), NULL — универсальный, подходит любому врачу."""

    __tablename__ = "room"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(10), unique=True, comment="Номер кабинета, например «204»")
    specialization_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialization.id"), comment="Профиль кабинета; NULL — универсальный"
    )


# --------------------------------------------------------------------------- #
# Договоры и график
# --------------------------------------------------------------------------- #


class Contract(Base):
    """Договор с врачом."""

    __tablename__ = "contract"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.id"))
    number: Mapped[str] = mapped_column(String(50), unique=True)
    signed_at: Mapped[date] = mapped_column(Date, comment="Дата подписания")
    valid_from: Mapped[date] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date, comment="NULL — бессрочный")
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus, name="contract_status"))


class ScheduleTemplate(Base):
    """Регулярный режим работы врача; по шаблонам генерируются слоты."""

    __tablename__ = "schedule_template"
    __table_args__ = (
        UniqueConstraint("doctor_id", "weekday", "start_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.id"))
    weekday: Mapped[int] = mapped_column(Integer, comment="0 — понедельник … 6 — воскресенье")
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Slot(Base):
    """Слот приёма: врач + интервал времени. Создаётся по шаблону или вручную."""

    __tablename__ = "slot"
    __table_args__ = (
        UniqueConstraint("doctor_id", "starts_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctor.id"),
        comment="Дублирует шаблон, но нужен для слотов вне шаблона",
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedule_template.id", ondelete="SET NULL"),
        comment="NULL — слот создан вручную (или шаблон удалён)",
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[SlotStatus] = mapped_column(Enum(SlotStatus, name="slot_status"))


class DoctorWorkday(Base):
    """Рабочий день врача: утром на регистратуре закрепляется за кабинетом.
    Отсюда табло узнаёт, кто в каком кабинете принимает."""

    __tablename__ = "doctor_workday"
    __table_args__ = (
        UniqueConstraint("work_date", "doctor_id"),
        UniqueConstraint("work_date", "room_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.id"))
    room_id: Mapped[int] = mapped_column(ForeignKey("room.id"))
    work_date: Mapped[date] = mapped_column(Date)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), comment="Врач занял кабинет"
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), comment="Кабинет освобождён"
    )


# --------------------------------------------------------------------------- #
# Пациенты и приём
# --------------------------------------------------------------------------- #


class Patient(Base):
    """Пациент. СНИЛС — ключ идентификации гражданина РФ; всё, кроме
    гражданства, может быть неизвестно на момент приёма (скорая, без сознания)."""

    __tablename__ = "patient"

    id: Mapped[int] = mapped_column(primary_key=True)
    snils: Mapped[str | None] = mapped_column(
        String(11), unique=True, comment="11 цифр без разделителей; NULL — СНИЛСа нет"
    )
    full_name: Mapped[str | None] = mapped_column(
        String(200), comment="NULL — личность пока не установлена"
    )
    birth_date: Mapped[date | None] = mapped_column(Date)
    citizenship: Mapped[str] = mapped_column(
        String(3),
        server_default=text("'RUS'"),
        comment="ISO 3166-1 alpha-3; основа для раздельных вечерних выгрузок РФ/не-РФ",
    )
    insurance_policy: Mapped[str | None] = mapped_column(
        String(50), comment="Полис сторонней страховки (для пациентов без СНИЛС)"
    )
    insurance_company: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(20))


class Appointment(Base):
    """Запись пациента на слот (оформляется регистратурой, в т.ч. по звонку)."""

    __tablename__ = "appointment"

    id: Mapped[int] = mapped_column(primary_key=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("slot.id"), unique=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"))
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus, name="appointment_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Ticket(Base):
    """Талон живой очереди: номер пациента, который выводится на табло.
    Выдаётся регистратурой при визите — по записи или без неё."""

    __tablename__ = "ticket"
    __table_args__ = (
        UniqueConstraint("ticket_date", "number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_date: Mapped[date] = mapped_column(
        Date, server_default=text("CURRENT_DATE"), comment="День, за который выдан номер"
    )
    number: Mapped[int] = mapped_column(Integer, comment="Номер на табло, уникален в рамках дня")
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"))
    doctor_workday_id: Mapped[int | None] = mapped_column(
        ForeignKey("doctor_workday.id"), comment="К какому врачу очередь; NULL — не распределён"
    )
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointment.id"), comment="Ссылка на запись, если пациент пришёл по записи"
    )
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus, name="ticket_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Referral(Base):
    """Направление врача. Адресат — специальность (решено), конкретного врача
    и слот подбирает регистратура при визите пациента."""

    __tablename__ = "referral"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"))
    from_doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.id"), comment="Направивший врач")
    to_specialization_id: Mapped[int] = mapped_column(ForeignKey("specialization.id"), comment="Куда направлен")
    reason: Mapped[str | None] = mapped_column(Text, comment="Повод направления")
    status: Mapped[ReferralStatus] = mapped_column(Enum(ReferralStatus, name="referral_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CallbackRequest(Base):
    """Заявка на перезвон с внешнего сайта."""

    __tablename__ = "callback_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20))
    full_name: Mapped[str | None] = mapped_column(String(200))
    comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[CallbackStatus] = mapped_column(Enum(CallbackStatus, name="callback_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --------------------------------------------------------------------------- #
# Медицинские данные
# --------------------------------------------------------------------------- #


class MedicalRecord(Base):
    """Запись приёма. Прямые patient_id и doctor_id обязательны: приём живой
    очереди происходит без appointment."""

    __tablename__ = "medical_record"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointment.id"), unique=True, comment="NULL — приём без записи"
    )
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.id"))
    complaints: Mapped[str | None] = mapped_column(Text, comment="Жалобы")
    anamnesis: Mapped[str | None] = mapped_column(Text, comment="Анамнез")
    treatment: Mapped[str | None] = mapped_column(Text, comment="Назначения и лечение")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Diagnosis(Base):
    """Диагноз по МКБ-10 (справочник)."""

    __tablename__ = "diagnosis"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, comment="Код МКБ-10")
    name: Mapped[str] = mapped_column(String(200))


class MedicalRecordDiagnosis(Base):
    """Диагнозы записи приёма: один основной, остальные — сопутствующие."""

    __tablename__ = "medical_record_diagnosis"

    medical_record_id: Mapped[int] = mapped_column(ForeignKey("medical_record.id"), primary_key=True)
    diagnosis_id: Mapped[int] = mapped_column(ForeignKey("diagnosis.id"), primary_key=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, comment="Основной диагноз")
