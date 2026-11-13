/**
 * Табло очереди для ТВ (E7): тёмный киоск-режим без авторизации, живые данные
 * GET /api/board с опросом раз в 5 секунд. Доступ ограничивается на уровне
 * сети/nginx (D2), не логином; персональных данных пациентов нет — только номера.
 */

import { useEffect, useState } from 'react';

import { api } from '@pandora/shared';
import type { components } from '@pandora/shared';

type BoardOut = components['schemas']['BoardOut'];

const POLL_MS = 5000;

const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];

/** «5 ноября 2026, четверг» из даты ответа API. */
function formatBoardDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('ru-RU', { month: 'long' })} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`;
}

export default function Board() {
  const [data, setData] = useState<BoardOut | null>(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // живые часы каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // опрос табло: раз в 5 секунд; при сбое держим последние данные
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { data: body } = await api.GET('/api/board');
      if (cancelled) return;
      if (body) {
        setData(body);
        setOffline(false);
      } else {
        setOffline(true);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="board-container">
      <div className="board-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 60, height: 60, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2.5rem' }}>+</div>
          <div>
            <div style={{ fontWeight: 700, lineHeight: 1 }}>Pandora</div>
            <div style={{ fontSize: '1rem', letterSpacing: 3, color: 'var(--text-muted)' }}>ПОЛИКЛИНИКА</div>
          </div>
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '3rem', fontWeight: 300 }}>
          {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {data && (
        <div style={{ fontSize: '1.4rem', color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
          {formatBoardDate(data.date)}
          {offline && ' · нет связи, показаны последние данные'}
        </div>
      )}

      {!data ? (
        <div style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.85)', flex: 1, display: 'flex', alignItems: 'center' }}>
          {offline ? 'Нет связи с сервером — проверьте подключение' : 'Загрузка…'}
        </div>
      ) : data.rooms.length === 0 ? (
        <div style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.85)', flex: 1, display: 'flex', alignItems: 'center' }}>
          Смены ещё не открыты — кабинеты не закреплены
        </div>
      ) : (
        <div className="board-rooms">
          {data.rooms.map((room) => (
            <div
              key={room.workday_id}
              className={`board-room ${room.current.length > 0 ? 'board-room-active' : ''}`}
            >
              <div className="board-room-title">
                <div className="board-room-number">Кабинет {room.room_number}</div>
                <div className="board-room-spec">
                  {room.specialization_name ?? ''}
                  {room.doctor_name && (
                    <>
                      <br />
                      {room.doctor_name}
                    </>
                  )}
                </div>
              </div>

              {room.current.length > 0 ? (
                <>
                  <div className="board-called-numbers">
                    {room.current.map((t) => t.number).join('  ')}
                  </div>
                  <div className="board-room-hint">пройдите в кабинет</div>
                </>
              ) : (
                <div className="board-room-hint" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Ожидайте вызова
                </div>
              )}

              <div className="board-waiting-row">
                <span>Очередь:</span>
                {room.waiting_numbers.length === 0 ? (
                  <span style={{ fontSize: '1.6rem' }}>пусто</span>
                ) : (
                  room.waiting_numbers.map((number) => (
                    <span key={number} className="board-waiting-chip">{number}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
