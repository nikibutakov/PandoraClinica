import { useState } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

export default function AdminSlots() {
  const slots = [
    { id: 1, time: '09:00 - 09:20', doc: 'Анна Иванова', room: '101', status: 'free' },
    { id: 2, time: '09:20 - 09:40', doc: 'Анна Иванова', room: '101', status: 'booked' },
    { id: 3, time: '10:00 - 10:20', doc: 'Анна Иванова', room: '101', status: 'blocked' },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Слоты</h1><p className="page-subtitle">Генерация и контроль расписания по дням.</p></div>
      </div>
      <div className="card mb-4">
        <div className="flex items-end gap-4">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Дата для генерации</label>
            <DatePicker defaultValue={dayjs('2026-11-05')} format="DD.MM.YYYY" style={{ width: '100%', padding: '6px 11px' }} />
          </div>
          <button className="btn btn-primary">Сгенерировать слоты</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Слоты на 05 Ноя 2026</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Время</th><th>Врач</th><th>Кабинет</th><th>Статус</th><th>Действие</th></tr></thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.id}>
                  <td className="font-medium">{slot.time}</td>
                  <td>{slot.doc}</td>
                  <td>{slot.room}</td>
                  <td>
                    {slot.status === 'free' && <span className="badge badge-active">Свободно</span>}
                    {slot.status === 'booked' && <span className="badge badge-done">Занято</span>}
                    {slot.status === 'blocked' && <span className="badge badge-danger">Заблокировано</span>}
                  </td>
                  <td>
                    <button className={`btn ${slot.status === 'blocked' ? 'btn-outline' : 'btn-danger-outline'} btn-sm`} disabled={slot.status === 'booked'}>
                      {slot.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}