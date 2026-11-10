import { useState } from 'react';
import { Select } from 'antd';

export default function RegShift() {
  const [doctors, setDoctors] = useState([
    { id: 1, name: 'Анна Иванова', shift: '08:00–16:00', status: 'active', room: '101', initials: 'АИ' },
    { id: 2, name: 'Елена Соколова', shift: '09:00–17:00', status: 'active', room: '102', initials: 'ЕС' },
  ]);

  const handleUpdate = (id: number, field: string, value: string) => {
    setDoctors(doctors.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Смены и кабинеты</h1><p className="page-subtitle">Управление статусами врачей и кабинетами на сегодня.</p></div>
        <button className="btn btn-outline">Сегодня · 05 Ноя</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Врачи на смене (Всего: 5)</h3>
          <span className="text-xs text-muted">Выберите значения для изменения</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Врач</th><th>Смена</th><th>Статус</th><th>Кабинет</th></tr></thead>
            <tbody>
              {doctors.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{doc.initials}</div>
                      <div className="font-medium text-dark">{doc.name}</div>
                    </div>
                  </td>
                  <td className="text-muted">{doc.shift}</td>
                  <td>
                    <Select
                      value={doc.status}
                      style={{ width: 140, height: 32 }}
                      onChange={(val) => handleUpdate(doc.id, 'status', val)}
                      options={[
                        { value: 'active', label: <span style={{ color: 'var(--status-active-text)' }}>Активен</span> },
                        { value: 'break', label: <span style={{ color: 'var(--warning)' }}>Перерыв</span> },
                        { value: 'done', label: <span style={{ color: 'var(--status-done-text)' }}>Завершил</span> },
                      ]}
                    />
                  </td>
                  <td>
                    <Select
                      value={doc.room}
                      style={{ width: 130, height: 32 }}
                      onChange={(val) => handleUpdate(doc.id, 'room', val)}
                      options={[
                        { value: '101', label: 'Каб. 101' },
                        { value: '102', label: 'Каб. 102' },
                        { value: 'none', label: 'Нет кабинета' },
                      ]}
                    />
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