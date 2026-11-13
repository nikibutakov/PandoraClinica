/**
 * Запись и талоны (E3): выбор специальности → свободные слоты на день →
 * запись (в том числе по направлению) и выдача талона; талон живой очереди —
 * к врачу с открытой сменой.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { App, Alert, Modal, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';
import PatientSelect from '../../components/PatientSelect';

type SpecializationOut = components['schemas']['SpecializationOut'];
type SlotOut = components['schemas']['SlotOut'];
type ReferralOut = components['schemas']['ReferralOut'];
type MorningOut = components['schemas']['MorningOut'];
type AppointmentOut = components['schemas']['AppointmentOut'];

const DAYS_TO_SHOW = 7;

const hhmm = (iso: string) => dayjs(iso).format('HH:mm');

export default function RegBooking() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patientId, setPatientId] = useState<number | null>(null);

  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [specializationId, setSpecializationId] = useState<number | null>(null);

  // лента дней: всегда от сегодняшнего
  const days = useMemo(
    () => Array.from({ length: DAYS_TO_SHOW }, (_, i) => dayjs().add(i, 'day')),
    [],
  );
  const [date, setDate] = useState<Dayjs>(() => dayjs());

  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotId, setSlotId] = useState<number | null>(null);

  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [referralId, setReferralId] = useState<number | null>(null);

  const [morning, setMorning] = useState<MorningOut | null>(null);
  const [workdayId, setWorkdayId] = useState<number | null>(null);

  // запись создана: предлагаем выдать талон на приём
  const [booked, setBooked] = useState<{
    appointment: AppointmentOut;
    slot: SlotOut;
  } | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // справочники: специальности, активные направления, открытые смены
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: specs }, { data: refs }, { data: morningData }] = await Promise.all([
        api.GET('/api/public/specializations'),
        api.GET('/api/registrar/referrals', { params: { query: { status: 'active' } } }),
        api.GET('/api/registrar/morning'),
      ]);
      if (cancelled) return;
      setSpecializations(specs ?? []);
      setReferrals(refs ?? []);
      setMorning(morningData ?? null);
      // ?referral=ID — пришли с экрана направлений
      const fromQuery = Number(searchParams.get('referral'));
      if (fromQuery && refs?.some((r) => r.id === fromQuery)) {
        setReferralId(fromQuery);
      }
    })();
    return () => {
      cancelled = true;
    };
    // searchParams не нужен в зависимостях: читаем один раз при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // свободные слоты выбранной специальности на выбранный день
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (specializationId === null) {
        setSlots([]);
        setSlotsError('');
        setSlotsLoading(false);
        return;
      }
      setSlotsLoading(true);
      const from = date.format('YYYY-MM-DD');
      const { data, error, response } = await api.GET('/api/registrar/slots', {
        params: {
          query: {
            specialization_id: specializationId,
            date_from: from,
            date_to: from,
          },
        },
      });
      if (cancelled) return;
      if (data) {
        // прошедшие слоты сегодняшнего дня не показываем
        setSlots(data.filter((s) => dayjs(s.starts_at).isAfter(dayjs())));
        setSlotsError('');
      } else {
        setSlotsError(formatApiError(error, response.status));
      }
      setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [specializationId, date]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === slotId) ?? null,
    [slots, slotId],
  );
  const selectedReferral = referrals.find((r) => r.id === referralId);

  const book = async () => {
    if (patientId === null) {
      message.warning('Сначала выберите пациента');
      return;
    }
    if (slotId === null || !selectedSlot) {
      message.warning('Выберите время приёма');
      return;
    }
    setBooking(true);
    const { data: appointment, error, response } = await api.POST('/api/registrar/appointments', {
      body: {
        slot_id: selectedSlot.id,
        patient_id: patientId,
        referral_id: referralId ?? undefined,
      },
    });
    setBooking(false);
    if (appointment) {
      setBooked({ appointment, slot: selectedSlot });
      if (referralId) {
        setReferralId(null);
        searchParams.delete('referral');
        setSearchParams(searchParams, { replace: true });
        const { data: refs } = await api.GET('/api/registrar/referrals', {
          params: { query: { status: 'active' } },
        });
        setReferrals(refs ?? []);
      }
      // слот занялся — убираем из сетки
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id));
      setSlotId(null);
    } else {
      message.error(formatApiError(error, response.status));
    }
  };

  /** Талон по только что созданной записи: врач и день берутся из слота. */
  const issueTicketForAppointment = useCallback(async () => {
    if (!booked || patientId === null) return;
    setTicketLoading(true);
    const { data: ticket, error, response } = await api.POST('/api/registrar/tickets', {
      body: { patient_id: patientId, appointment_id: booked.appointment.id },
    });
    setTicketLoading(false);
    if (ticket) {
      message.success(`Талон №${ticket.number} выдан — номер появится на табло`);
      setBooked(null);
    } else {
      message.error(formatApiError(error, response.status));
    }
  }, [booked, patientId, message]);

  /** Талон живой очереди: к конкретному работающему сегодня врачу. */
  const issueLiveTicket = async () => {
    if (patientId === null) {
      message.warning('Сначала выберите пациента');
      return;
    }
    if (workdayId === null) {
      message.warning('Выберите врача (открытую смену)');
      return;
    }
    const { data: ticket, error, response } = await api.POST('/api/registrar/tickets', {
      body: { patient_id: patientId, doctor_workday_id: workdayId },
    });
    if (ticket) {
      message.success(`Талон №${ticket.number} выдан — номер появится на табло`);
    } else {
      message.error(formatApiError(error, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Запись и талоны</h1>
          <p className="page-subtitle">Специальность → свободное время → талон. Запись по специальности, не по врачу.</p>
        </div>
      </div>

      <div className="booking-layout">
        {/* Колонка 1: специальность + направление */}
        <div className="booking-step">
          <div className="step-title">1. Специальность</div>
          {specializations.map((s) => (
            <div
              key={s.id}
              className={`care-item ${specializationId === s.id ? 'active' : ''}`}
              onClick={() => { setSpecializationId(s.id); setSlotId(null); }}
            >
              <span className={`font-medium ${specializationId === s.id ? 'text-primary' : 'text-muted'}`}>{s.name}</span>
            </div>
          ))}
          {specializations.length === 0 && (
            <p className="text-xs text-muted">Специальностей нет — заводятся в «Справочниках»</p>
          )}
          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }}></div>
          <div className="step-title" style={{ fontSize: '0.85rem' }}>Запись по направлению</div>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Без направления"
            allowClear
            value={referralId}
            onChange={setReferralId}
            options={referrals.map((r) => ({
              value: r.id,
              label: `Направление №${r.id} · пациент №${r.patient_id}`,
            }))}
          />
          {selectedReferral && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 8 }}
              message={`Запись по направлению №${selectedReferral.id}`}
              description={`При записи направление закроется. Причина: ${selectedReferral.reason ?? 'не указана'}`}
            />
          )}
        </div>

        {/* Колонка 2: день + слоты */}
        <div className="booking-step">
          <div className="step-title">2. Дата и время</div>
          <div className="calendar-mock">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <div key={d} className="cal-header">{d}</div>
            ))}
            {days.map((d) => (
              <div
                key={d.format('YYYY-MM-DD')}
                className={`cal-day ${date.isSame(d, 'day') ? 'active' : ''}`}
                onClick={() => { setDate(d); setSlotId(null); }}
              >
                {d.format('D')}
              </div>
            ))}
          </div>

          <div className="text-xs text-muted mb-2">
            Свободные слоты на {date.format('DD.MM (dd)')}:
          </div>
          {specializationId === null ? (
            <p className="text-sm text-muted">Выберите специальность, чтобы увидеть слоты</p>
          ) : slotsLoading ? (
            <Spin style={{ display: 'block', margin: 16 }} />
          ) : slotsError ? (
            <p className="text-danger text-sm">{slotsError}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">Свободных слотов нет — попробуйте другой день</p>
          ) : (
            <div className="time-slots">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className={`time-slot ${slotId === s.id ? 'active' : ''}`}
                  title={s.doctor_name ?? ''}
                  onClick={() => setSlotId(s.id)}
                >
                  {hhmm(s.starts_at)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Колонка 3: пациент и талон */}
        <div className="booking-step" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
          <div className="step-title">3. Пациент и талон</div>
          <PatientSelect
            value={patientId}
            onChange={(id) => setPatientId(id)}
          />
          <div className="card" style={{ padding: 12, marginTop: 12, background: 'var(--white)' }}>
            {selectedSlot ? (
              <>
                <div className="text-sm font-medium text-dark">{date.format('DD.MM')} в {hhmm(selectedSlot.starts_at)}–{hhmm(selectedSlot.ends_at)}</div>
                <div className="text-xs text-muted mt-1">Врач: {selectedSlot.doctor_name ?? '—'}</div>
              </>
            ) : (
              <div className="text-sm text-muted">Время приёма не выбрано</div>
            )}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={booking} onClick={() => void book()}>
            {booking ? 'Записываем…' : 'Записать и выдать талон'}
          </button>
        </div>
      </div>

      {/* Талон живой очереди */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 12 }}>Талон живой очереди</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <Select
            style={{ minWidth: 360 }}
            placeholder="Врач с открытой сменой"
            value={workdayId}
            onChange={setWorkdayId}
            options={(morning?.occupied ?? []).map((o) => ({
              value: o.workday_id,
              label: `Каб. ${o.room_number} · ${o.full_name} (${o.specialization_name})`,
            }))}
          />
          <button className="btn btn-primary" onClick={() => void issueLiveTicket()}>
            Выдать талон
          </button>
          <span className="text-xs text-muted">
            Смены открываются на «Сменах и кабинетах» утром
          </span>
        </div>
      </div>

      <Modal
        title="Пациент записан"
        open={booked !== null}
        okText="Выдать талон"
        cancelText="Позже"
        confirmLoading={ticketLoading}
        onOk={() => void issueTicketForAppointment()}
        onCancel={() => setBooked(null)}
      >
        {booked && (
          <p className="text-sm">
            Пациент записан {dayjs(booked.slot.starts_at).format('DD.MM в HH:mm')} к врачу{' '}
            {booked.slot.doctor_name ?? ''}. Выдать талон сейчас?
          </p>
        )}
      </Modal>
    </div>
  );
}
