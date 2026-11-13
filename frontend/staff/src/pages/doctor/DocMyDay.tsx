/**
 * Мой день врача (E5): кабинет, очередь по статусам, вызов пациента,
 * «не дождался», переход к приёму. Очередь обновляется опросом каждые 10 секунд.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Spin } from 'antd';
import dayjs from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type TodayOut = components['schemas']['TodayOut'];
type QueueItemOut = components['schemas']['QueueItemOut'];

const POLL_MS = 10000;

const hhmm = (iso: string) => dayjs(iso).format('HH:mm');

export default function DocMyDay() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [today, setToday] = useState<TodayOut | null>(null);
  const [queue, setQueue] = useState<QueueItemOut[]>([]);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  // опрос today + queue; reloadCount — немедленное обновление после действия
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const [todayRes, queueRes] = await Promise.all([
        api.GET('/api/doctor/me/today'),
        api.GET('/api/doctor/queue'),
      ]);
      if (cancelled) return;
      if (todayRes.data && queueRes.data) {
        setToday(todayRes.data);
        setQueue(queueRes.data);
        setError('');
      } else {
        const failed = todayRes.data === undefined ? todayRes : queueRes;
        setError(formatApiError(failed.error, failed.response.status));
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reloadCount]);

  const call = useCallback(
    async (ticket: QueueItemOut) => {
      const { data, error: errBody, response } = await api.POST('/api/doctor/queue/{ticket_id}/call', {
        params: { path: { ticket_id: ticket.id } },
      });
      if (data) {
        message.success(`Пациент №${ticket.number} вызван — номер на табло`);
        setQueue((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'called' } : t)));
      } else {
        message.error(formatApiError(errBody, response.status));
        setReloadCount((n) => n + 1);
      }
    },
    [message],
  );

  const skip = useCallback(
    async (ticket: QueueItemOut) => {
      const { data, error: errBody, response } = await api.POST('/api/doctor/queue/{ticket_id}/skip', {
        params: { path: { ticket_id: ticket.id } },
      });
      if (data) {
        message.info(`Талон №${ticket.number} пропущен`);
        setQueue((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'skipped' } : t)));
      } else {
        message.error(formatApiError(errBody, response.status));
        setReloadCount((n) => n + 1);
      }
    },
    [message],
  );

  const byStatus = useMemo(() => {
    const pick = (...statuses: QueueItemOut['status'][]) =>
      queue.filter((t) => statuses.includes(t.status));
    return {
      waiting: pick('waiting'),
      called: pick('called'),
      inProgress: pick('in_progress'),
      finished: pick('done', 'skipped'),
    };
  }, [queue]);

  const callNext = () => {
    const next = byStatus.waiting[0];
    if (!next) {
      message.info('Очередь пуста — вызывать некого');
      return;
    }
    void call(next);
  };

  const card = (ticket: QueueItemOut, dimmed = false) => (
    <div key={ticket.id} className="kanban-card" style={dimmed ? { opacity: 0.55 } : undefined}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-dark text-sm">
          №{ticket.number} · {ticket.patient_name ?? 'пациент'}
        </div>
        <div className="text-xs text-muted font-medium">
          {ticket.appointment_starts_at ? hhmm(ticket.appointment_starts_at) : 'живая очередь'}
        </div>
      </div>
      {ticket.status === 'waiting' && (
        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 1, padding: 4, fontSize: '0.75rem' }} onClick={() => void call(ticket)}>
            Вызвать
          </button>
          <button className="btn btn-danger-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => void skip(ticket)}>
            Пропуск
          </button>
        </div>
      )}
      {ticket.status === 'called' && (
        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 1, padding: 4, fontSize: '0.75rem' }} onClick={() => navigate(`/staff/doc/record?ticket=${ticket.id}`)}>
            Начать приём
          </button>
          <button className="btn btn-danger-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => void skip(ticket)}>
            Не дождался
          </button>
        </div>
      )}
      {ticket.status === 'in_progress' && (
        <button className="btn btn-primary w-100" style={{ padding: 4, fontSize: '0.75rem' }} onClick={() => navigate(`/staff/doc/record?ticket=${ticket.id}`)}>
          Продолжить приём
        </button>
      )}
      {dimmed && (
        <div className="text-xs text-muted mt-2">
          {ticket.status === 'skipped' ? 'Не дождался' : 'Принят'}
        </div>
      )}
    </div>
  );

  if (error) return <div className="view"><p className="text-danger text-sm">{error}</p></div>;
  if (!today) return <Spin size="large" style={{ display: 'block', margin: 80 }} />;

  const counts = today.queue;

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Мой день</h1>
          <p className="page-subtitle">{dayjs(today.date).format('DD.MM.YYYY')} · добро пожаловать.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setReloadCount((n) => n + 1)}>
          Обновить · {dayjs().format('HH:mm')}
        </button>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 16px' }}>
        <div className="flex items-center gap-3">
          {today.room_number ? (
            <>
              <div className="badge badge-active">● Смена активна · Кабинет {today.room_number}</div>
              <div className="text-sm text-muted">
                Ожидают: {counts.waiting} · вызваны: {counts.called} · принято: {counts.done} · пропущено: {counts.skipped}
              </div>
            </>
          ) : (
            <div className="badge badge-warning">Кабинет не закреплён — обратитесь в регистратуру (утренний экран)</div>
          )}
        </div>
        <button className="btn btn-primary" onClick={callNext} disabled={!today.room_number}>
          Вызвать следующего
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Очередь</h3>
        <span className="text-xs text-muted">Обновляется автоматически раз в 10 секунд</span>
      </div>

      <div className="kanban-board">
        <div className="kanban-col">
          <div className="kanban-header">
            <span>Ожидание</span>
            <span className="badge badge-warning">{byStatus.waiting.length}</span>
          </div>
          {byStatus.waiting.map((t) => card(t))}
        </div>
        <div className="kanban-col">
          <div className="kanban-header">
            <span>Вызван</span>
            <span className="badge badge-new">{byStatus.called.length}</span>
          </div>
          {byStatus.called.map((t) => card(t))}
        </div>
        <div className="kanban-col">
          <div className="kanban-header">
            <span>На приёме</span>
            <span className="badge badge-active">{byStatus.inProgress.length}</span>
          </div>
          {byStatus.inProgress.map((t) => card(t))}
        </div>
        <div className="kanban-col">
          <div className="kanban-header">
            <span>Завершено</span>
            <span className="badge badge-done">{byStatus.finished.length}</span>
          </div>
          {byStatus.finished.map((t) => card(t, true))}
        </div>
      </div>

      {queue.length === 0 && (
        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          {today.workday_id === null
            ? 'Смена не открыта — талоны появятся после закрепления кабинета в регистратуре'
            : 'Очередь пуста — пациенты получат талоны в регистратуре'}
        </p>
      )}
    </div>
  );
}
