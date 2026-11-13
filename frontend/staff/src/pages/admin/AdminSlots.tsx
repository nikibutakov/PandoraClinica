/**
 * Слоты (админ, E11): идемпотентная генерация из недельных шаблонов на период
 * и контроль занятости слотов за выбранную дату (фильтры: врач, специальность).
 */

import { useEffect, useState } from 'react';
import { App, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type SlotOut = components['schemas']['SlotOut'];
type DoctorOut = components['schemas']['DoctorOut'];
type SpecializationOut = components['schemas']['SpecializationOut'];

const SLOT_BADGE: Record<string, { label: string; className: string }> = {
  free: { label: 'Свободно', className: 'badge badge-active' },
  booked: { label: 'Занято', className: 'badge badge-warning' },
  blocked: { label: 'Снято с записи', className: 'badge badge-done' },
};

export default function AdminSlots() {
  const { message } = App.useApp();
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(dayjs());
  const [dateTo, setDateTo] = useState<Dayjs | null>(dayjs().add(13, 'day'));
  const [generating, setGenerating] = useState(false);

  const [controlDate, setControlDate] = useState<Dayjs | null>(dayjs());
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [specializationId, setSpecializationId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: docs }, { data: specs }] = await Promise.all([
        api.GET('/api/admin/doctors'),
        api.GET('/api/admin/specializations'),
      ]);
      if (cancelled) return;
      setDoctors(docs ?? []);
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // контроль слотов за выбранную дату (с фильтрами)
  useEffect(() => {
    if (controlDate === null) return;
    let cancelled = false;
    void (async () => {
      const { data, error: errBody, response } = await api.GET('/api/admin/slots', {
        params: {
          query: {
            date: controlDate.format('YYYY-MM-DD'),
            doctor_id: doctorId ?? undefined,
            specialization_id: specializationId ?? undefined,
          },
        },
      });
      if (cancelled) return;
      if (data) {
        setSlots(data);
        setError('');
      } else {
        setError(formatApiError(errBody, response.status));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [controlDate, doctorId, specializationId]);

  const generate = async () => {
    if (dateFrom === null || dateTo === null) {
      message.warning('Укажите период генерации');
      return;
    }
    if (dateTo.isBefore(dateFrom)) {
      message.warning('Дата «по» раньше даты «с»');
      return;
    }
    setGenerating(true);
    const { data, error: errBody, response } = await api.POST('/api/admin/slots/generate', {
      params: {
        query: {
          date_from: dateFrom.format('YYYY-MM-DD'),
          date_to: dateTo.format('YYYY-MM-DD'),
        },
      },
    });
    setGenerating(false);
    if (response.ok) {
      message.success(
        `Готово: создано ${(data as { created: number } | undefined)?.created ?? 0} слотов (существующие пропущены)`,
      );
      setControlDate(dateFrom);
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Слоты</h1>
          <p className="page-subtitle">Генерация из шаблонов графика и контроль занятости по дням.</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Период генерации: с</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} allowClear={false} format="DD.MM.YYYY" />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>по</label>
            <DatePicker value={dateTo} onChange={setDateTo} allowClear={false} format="DD.MM.YYYY" />
          </div>
          <button className="btn btn-primary" disabled={generating} onClick={() => void generate()}>
            {generating ? 'Генерируем…' : 'Сгенерировать слоты'}
          </button>
          <span className="text-xs text-muted">Идемпотентно: уже существующие слоты пропускаются</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)', margin: 0 }}>
            Слоты на {controlDate ? controlDate.format('DD.MM.YYYY') : '—'}
          </h3>
          <div className="flex gap-2 items-center flex-wrap">
            <DatePicker value={controlDate} onChange={(d) => setControlDate(d)} allowClear={false} format="DD.MM.YYYY" />
            <Select
              style={{ width: 220 }}
              placeholder="Все врачи"
              allowClear
              showSearch
              optionFilterProp="label"
              value={doctorId}
              onChange={setDoctorId}
              options={doctors.map((d) => ({ value: d.id, label: d.full_name ?? `Врач №${d.id}` }))}
            />
            <Select
              style={{ width: 190 }}
              placeholder="Все специальности"
              allowClear
              value={specializationId}
              onChange={setSpecializationId}
              options={specializations.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>
        </div>
        {error && <p className="text-danger text-sm" style={{ padding: '8px 16px 0' }}>{error}</p>}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Время</th><th>Врач</th><th>Специальность</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="text-muted">Загрузка…</td></tr>}
              {slots.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">
                    {dayjs(s.starts_at).format('HH:mm')} – {dayjs(s.ends_at).format('HH:mm')}
                  </td>
                  <td>{s.doctor_name ?? '—'}</td>
                  <td className="text-muted">
                    {specializations.find((sp) => sp.id === s.specialization_id)?.name ?? '—'}
                  </td>
                  <td>
                    <span className={SLOT_BADGE[s.status]?.className ?? 'badge'}>
                      {SLOT_BADGE[s.status]?.label ?? s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && slots.length === 0 && (
                <tr><td colSpan={4} className="text-muted">Слотов за эту дату нет — сгенерируйте их из шаблонов графика</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
