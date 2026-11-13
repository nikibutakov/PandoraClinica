/** Утренний экран смены (E1): кто закреплён, кто ожидается по графику, свободные кабинеты. */

import { useCallback, useEffect, useState } from 'react';
import { App, Modal, Select, Spin } from 'antd';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type MorningOut = components['schemas']['MorningOut'];
type MorningDoctor = components['schemas']['MorningDoctor'];
type MorningOccupied = components['schemas']['MorningOccupied'];

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

/** «9:00» из «09:00:00» бэкенда — без ведущих нулей и секунд. */
const hhmm = (iso: string | null) =>
  iso ? iso.slice(11, 16).replace(/^0/, '') : '—';

export default function RegShift() {
  const { message } = App.useApp();
  const [data, setData] = useState<MorningOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  // врач, для которого открыт модал закрепления
  const [assigning, setAssigning] = useState<MorningDoctor | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(
    () => setReloadCount((n) => n + 1),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data: body, error: errBody, response } = await api.GET('/api/registrar/morning');
      if (cancelled) return;
      if (body) {
        setData(body);
        setError('');
      } else {
        setError(formatApiError(errBody, response.status));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const assign = async () => {
    if (!assigning || roomId === null) return;
    setSaving(true);
    const { error: errBody, response } = await api.POST('/api/registrar/workdays', {
      body: { doctor_id: assigning.doctor_id, room_id: roomId },
    });
    setSaving(false);
    if (response.ok) {
      message.success(`${assigning.full_name} закреплён за кабинетом (смена открыта)`);
      setAssigning(null);
      setRoomId(null);
      reload();
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  if (loading && !data) return <Spin size="large" style={{ display: 'block', margin: 80 }} />;

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Смены и кабинеты</h1>
          <p className="page-subtitle">Закрепление врачей за кабинетами на сегодня.</p>
        </div>
        <button className="btn btn-outline">Сегодня · {data ? data.date.slice(8, 10) + '.' + data.date.slice(5, 7) : ''}</button>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Закреплены за кабинетами (Всего: {data?.occupied.length ?? 0})</h3>
          <span className="text-xs text-muted">Приём идёт — врач указан вместе с кабинетом</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Врач</th><th>Специальность</th><th>Смена с</th><th>Кабинет</th></tr>
            </thead>
            <tbody>
              {(data?.occupied ?? []).map((o: MorningOccupied) => (
                <tr key={o.workday_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{initials(o.full_name)}</div>
                      <div className="font-medium text-dark">{o.full_name ?? '—'}</div>
                    </div>
                  </td>
                  <td className="text-muted">{o.specialization_name ?? '—'}</td>
                  <td className="text-muted">{hhmm(o.started_at)}</td>
                  <td><span className="badge badge-active">Каб. {o.room_number}</span></td>
                </tr>
              ))}
              {data && data.occupied.length === 0 && (
                <tr><td colSpan={4} className="text-muted">Пока никого — закрепите врачей ниже</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Ожидается сегодня по графику (Всего: {data?.expected.length ?? 0})</h3>
          <span className="text-xs text-muted">Закрепите кабинет, чтобы врач начал приём</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Врач</th><th>Специальность</th><th>Приём по графику</th><th style={{ width: 180 }}></th></tr>
            </thead>
            <tbody>
              {(data?.expected ?? []).map((d: MorningDoctor) => (
                <tr key={d.doctor_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{initials(d.full_name)}</div>
                      <div className="font-medium text-dark">{d.full_name}</div>
                    </div>
                  </td>
                  <td className="text-muted">{d.specialization_name}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {d.windows.map((w, i) => (
                        <span key={i} className="badge badge-new">{hhmm(w.start_time)}–{hhmm(w.end_time)}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => { setAssigning(d); setRoomId(null); }}>
                      Закрепить кабинет
                    </button>
                  </td>
                </tr>
              ))}
              {data && data.expected.length === 0 && (
                <tr><td colSpan={4} className="text-muted">На сегодня графиков нет</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 12 }}>Свободные кабинеты</h3>
        {data && data.free_rooms.length === 0 ? (
          <p className="text-sm text-muted">Все кабинеты заняты</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {(data?.free_rooms ?? []).map((room) => (
              <span key={room.id} className="badge badge-done" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                № {room.number}{room.specialization_name ? ` · ${room.specialization_name}` : ' · универсальный'}
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal
        title={`Закрепить: ${assigning?.full_name ?? ''}`}
        open={assigning !== null}
        okText="Закрепить"
        cancelText="Отмена"
        confirmLoading={saving}
        okButtonProps={{ disabled: roomId === null }}
        onOk={() => void assign()}
        onCancel={() => setAssigning(null)}
      >
        <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
          Специальность: {assigning?.specialization_name}. Профильный кабинет другой специальности выбрать нельзя — бэкенд это проверит.
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите кабинет"
          value={roomId}
          onChange={setRoomId}
          loading={loading && Boolean(assigning)}
          options={(data?.free_rooms ?? []).map((room) => ({
            value: room.id,
            label: `Кабинет ${room.number}${room.specialization_name ? ` · ${room.specialization_name}` : ' · универсальный'}`,
            // профильный кабинет чужой специальности — сразу недоступен
            disabled:
              room.specialization_id !== null &&
              room.specialization_id !== assigning?.specialization_id,
          }))}
        />
      </Modal>
    </div>
  );
}
