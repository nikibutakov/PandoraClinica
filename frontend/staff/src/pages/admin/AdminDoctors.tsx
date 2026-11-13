/**
 * Врачи и график (админ, E10): найм одной операцией (учётка + договор),
 * недельный шаблон графика (полная замена через PUT), деактивация врача
 * (DELETE в API нет — отключение вместо увольнения).
 */

import { useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, Popconfirm, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type DoctorOut = components['schemas']['DoctorOut'];
type SpecializationOut = components['schemas']['SpecializationOut'];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface HireForm {
  full_name: string;
  login: string;
  password: string;
  specialization_id: number;
  contract_number: string;
  signed_at?: Dayjs;
  valid_from: Dayjs;
  valid_to?: Dayjs;
}

/** Одна строка редактора графика: день и границы интервала («HH:mm»). */
interface IntervalRow {
  weekday: number;
  start: string;
  end: string;
}

/** Инициалы из ФИО: первые буквы первых двух слов. */
function initials(fullName: string | null): string {
  if (!fullName) return '??';
  return (
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '??'
  );
}

const fmtDate = (iso: string) => dayjs(iso).format('DD.MM.YYYY');

export default function AdminDoctors() {
  const { message } = App.useApp();
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [hireOpen, setHireOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hireForm] = Form.useForm<HireForm>();

  // редактор графика
  const [scheduleDoctor, setScheduleDoctor] = useState<DoctorOut | null>(null);
  const [intervals, setIntervals] = useState<IntervalRow[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: docs, error: errBody, response }, { data: specs }] = await Promise.all([
        api.GET('/api/admin/doctors'),
        api.GET('/api/admin/specializations'),
      ]);
      if (cancelled) return;
      if (docs) setDoctors(docs);
      else setError(formatApiError(errBody, response.status));
      setSpecializations(specs ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDoctors = async () => {
    const { data } = await api.GET('/api/admin/doctors');
    setDoctors(data ?? []);
  };

  const hire = async () => {
    const values = await hireForm.validateFields();
    setSaving(true);
    const { data, error: errBody, response } = await api.POST('/api/admin/doctors', {
      body: {
        full_name: values.full_name,
        login: values.login,
        password: values.password,
        specialization_id: values.specialization_id,
        contract_number: values.contract_number,
        signed_at: values.signed_at?.format('YYYY-MM-DD') ?? null,
        valid_from: values.valid_from.format('YYYY-MM-DD'),
        valid_to: values.valid_to?.format('YYYY-MM-DD') ?? null,
      },
    });
    setSaving(false);
    if (data) {
      message.success(`Врач «${data.full_name}» нанят: учётка и договор созданы`);
      setHireOpen(false);
      hireForm.resetFields();
      void loadDoctors();
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const openSchedule = async (doctor: DoctorOut) => {
    setScheduleDoctor(doctor);
    const { data } = await api.GET('/api/admin/doctors/{doctor_id}/schedule', {
      params: { path: { doctor_id: doctor.id } },
    });
    setIntervals(
      (data ?? []).map((t) => ({
        weekday: t.weekday,
        start: t.start_time.slice(0, 5),
        end: t.end_time.slice(0, 5),
      })),
    );
  };

  const saveSchedule = async () => {
    if (scheduleDoctor === null) return;
    for (const row of intervals) {
      if (row.start >= row.end) {
        message.warning(`Интервал ${WEEKDAYS[row.weekday]}: начало позже конца`);
        return;
      }
    }
    setScheduleSaving(true);
    const { data, error: errBody, response } = await api.PUT('/api/admin/doctors/{doctor_id}/schedule', {
      params: { path: { doctor_id: scheduleDoctor.id } },
      body: {
        items: intervals.map((r) => ({
          weekday: r.weekday,
          start_time: r.start,
          end_time: r.end,
        })),
      },
    });
    setScheduleSaving(false);
    if (data) {
      message.success('График сохранён (полная замена шаблонов)');
      setScheduleDoctor(null);
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const toggleActive = async (doctor: DoctorOut) => {
    const { error: errBody, response } = await api.PATCH('/api/admin/doctors/{doctor_id}', {
      params: { path: { doctor_id: doctor.id } },
      body: { is_active: !doctor.is_active },
    });
    if (response.ok) {
      message.success(
        doctor.is_active
          ? 'Врач деактивирован — в графики и запись не попадает'
          : 'Врач снова работает',
      );
      void loadDoctors();
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Врачи и график</h1>
          <p className="page-subtitle">Найм с договором одной операцией, недельные шаблоны графика.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setHireOpen(true)}>
          + Нанять врача
        </button>
      </div>

      {error && <p className="text-danger text-sm" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Врач</th>
                <th>Логин</th>
                <th>Специальность</th>
                <th>Договор</th>
                <th>Статус</th>
                <th style={{ width: '220px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-muted">Загрузка…</td></tr>}
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{initials(d.full_name)}</div>
                      <div className="font-medium text-dark">{d.full_name ?? '—'}</div>
                    </div>
                  </td>
                  <td className="text-muted">{d.login ?? '—'}</td>
                  <td>{d.specialization_name ?? '—'}</td>
                  <td className="text-sm">
                    {d.contract
                      ? `№${d.contract.number} · ${fmtDate(d.contract.valid_from)}${
                          d.contract.valid_to ? `–${fmtDate(d.contract.valid_to)}` : ''
                        }`
                      : '—'}
                  </td>
                  <td>
                    <span className={`badge ${d.is_active ? 'badge-active' : 'badge-done'}`}>
                      {d.is_active ? 'Работает' : 'Отключён'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn btn-outline btn-sm" onClick={() => void openSchedule(d)}>
                        График
                      </button>
                      {d.is_active ? (
                        <Popconfirm
                          title="Отключить врача?"
                          description="Он пропадёт из утренних экранов и записи, пока не возвращён."
                          onConfirm={() => void toggleActive(d)}
                          okText="Отключить"
                          cancelText="Отмена"
                          okButtonProps={{ danger: true }}
                        >
                          <button className="btn btn-danger-outline btn-sm">Отключить</button>
                        </Popconfirm>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => void toggleActive(d)}>
                          Вернуть
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && doctors.length === 0 && (
                <tr><td colSpan={6} className="text-muted">Врачей пока нет — наймите первого</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛКА: НАЙМ ВРАЧА */}
      <Modal
        title="Найм врача: учётка + договор"
        open={hireOpen}
        onCancel={() => setHireOpen(false)}
        onOk={() => void hire()}
        okText="Нанять"
        cancelText="Отмена"
        confirmLoading={saving}
      >
        <Form form={hireForm} layout="vertical" requiredMark={false}>
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true, message: 'Введите ФИО' }]}>
            <Input placeholder="Орлова Вера Павловна" />
          </Form.Item>
          <div className="flex gap-2">
            <Form.Item name="login" label="Логин" rules={[{ required: true, message: 'Введите логин' }]} style={{ width: 200 }}>
              <Input placeholder="orlova" autoComplete="off" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 4, message: 'Минимум 4 символа' }]} style={{ width: 200 }}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </div>
          <Form.Item name="specialization_id" label="Специальность" rules={[{ required: true, message: 'Выберите специальность' }]}>
            <Select
              placeholder="Выберите специальность"
              options={specializations.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="contract_number" label="Номер договора" rules={[{ required: true, message: 'Введите номер договора' }]}>
            <Input placeholder="Д-005" style={{ width: 200 }} />
          </Form.Item>
          <div className="flex gap-2 flex-wrap">
            <Form.Item name="signed_at" label="Подписан">
              <DatePicker placeholder="сегодня" />
            </Form.Item>
            <Form.Item name="valid_from" label="Действует с" rules={[{ required: true, message: 'Укажите дату начала' }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="valid_to" label="Действует до">
              <DatePicker placeholder="бессрочный" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* МОДАЛКА: ГРАФИК */}
      <Modal
        title={`Недельный график: ${scheduleDoctor?.full_name ?? ''}`}
        open={scheduleDoctor !== null}
        onCancel={() => setScheduleDoctor(null)}
        onOk={() => void saveSchedule()}
        okText="Сохранить (полная замена)"
        cancelText="Отмена"
        confirmLoading={scheduleSaving}
        width={560}
      >
        <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: 8, marginTop: 16 }}>
          {intervals.map((row, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
              <Select
                style={{ width: 90 }}
                value={row.weekday}
                options={WEEKDAYS.map((label, weekday) => ({ value: weekday, label }))}
                onChange={(weekday) =>
                  setIntervals((prev) => prev.map((r, j) => (j === i ? { ...r, weekday } : r)))
                }
              />
              <TimePicker
                format="HH:mm"
                minuteStep={30}
                value={row.start ? dayjs(row.start, 'HH:mm') : null}
                onChange={(d) =>
                  setIntervals((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, start: d?.format('HH:mm') ?? '' } : r)),
                  )
                }
              />
              <span className="text-muted">—</span>
              <TimePicker
                format="HH:mm"
                minuteStep={30}
                value={row.end ? dayjs(row.end, 'HH:mm') : null}
                onChange={(d) =>
                  setIntervals((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, end: d?.format('HH:mm') ?? '' } : r)),
                  )
                }
              />
              <button
                className="btn btn-danger-outline btn-sm"
                onClick={() => setIntervals((prev) => prev.filter((_, j) => j !== i))}
              >
                Удалить
              </button>
            </div>
          ))}
          {intervals.length === 0 && (
            <p className="text-sm text-muted">Интервалов нет — врач не попадёт в утренние экраны</p>
          )}
          <button
            className="btn btn-outline btn-sm mt-2"
            onClick={() => setIntervals((prev) => [...prev, { weekday: 0, start: '09:00', end: '14:00' }])}
          >
            + Добавить интервал
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Сохранение полностью заменяет график: по шаблонам затем генерируются слоты (экран «Слоты»).
        </p>
      </Modal>
    </div>
  );
}
