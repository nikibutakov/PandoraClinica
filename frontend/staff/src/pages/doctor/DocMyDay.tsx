import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  time: string;
  type: string;
  status: 'waiting' | 'called' | 'inprogress' | 'missed';
}

export default function DocMyDay() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([
    { id: 'w1', name: 'Белла Фомина', time: '10:40', type: 'Повторный', status: 'waiting' },
    { id: 'w2', name: 'Даниил Лебедев', time: '11:00', type: 'Консультация', status: 'waiting' },
    { id: 'ip1', name: 'Анна Смирнова', time: '10:00', type: 'Первичный', status: 'inprogress' },
    { id: 'm1', name: 'Лев Переверзев', time: '09:40', type: 'Повторный', status: 'missed' },
  ]);

  const movePatient = (id: string, newStatus: Patient['status']) => {
    setPatients(patients.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const getPatientsByStatus = (status: Patient['status']) => patients.filter(p => p.status === status);

  const renderColumn = (title: string, status: Patient['status'], badgeClass: string) => {
    const items = getPatientsByStatus(status);
    return (
      <div className="kanban-col">
        <div className="kanban-header">
          <span>{title}</span>
          <span className={`badge ${badgeClass}`}>{items.length}</span>
        </div>
        {items.map(p => (
          <div key={p.id} className="kanban-card" style={{ borderLeft: status === 'missed' ? '2px solid var(--danger)' : 'none' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-dark text-sm">{p.name}</div>
              <div className="text-xs text-muted font-medium">{p.time}</div>
            </div>
            <div className="text-xs text-muted mb-3">{p.type}</div>
            
            {status === 'waiting' && (
              <div className="flex gap-2">
                <button className="btn btn-primary" style={{ flex: 1, padding: 4, fontSize: '0.75rem' }} onClick={() => movePatient(p.id, 'called')}>Вызвать</button>
                <button className="btn btn-danger-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => movePatient(p.id, 'missed')}>Пропуск</button>
              </div>
            )}
            {status === 'inprogress' && (
              <button className="btn btn-primary w-100" style={{ padding: 6 }} onClick={() => navigate('/staff/doc/record')}>Открыть</button>
            )}
            {status === 'missed' && (
              <button className="btn btn-outline w-100" style={{ padding: 4, fontSize: '0.75rem' }} onClick={() => movePatient(p.id, 'waiting')}>Вернуть</button>
            )}
            {status === 'called' && (
              <div className="text-xs text-primary font-medium mt-2">Направлен в каб. 101</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Мой день</h1><p className="page-subtitle">Доброе утро, Анна. Ваш план на сегодня.</p></div>
        <button className="btn btn-outline">Сегодня · 05 Ноя</button>
      </div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 16px' }}>
        <div className="flex items-center gap-3">
          <div className="badge badge-active">● Смена активна</div>
          <div className="text-sm text-muted">08:00-16:00 · 6 приемов завершено</div>
        </div>
        <button className="btn btn-outline">Завершить смену</button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Очередь</h3>
        <button className="btn btn-primary" onClick={() => {
          const firstWaiting = patients.find(p => p.status === 'waiting');
          if (firstWaiting) movePatient(firstWaiting.id, 'called');
        }}>Вызвать следующего</button>
      </div>

      <div className="kanban-board">
        {renderColumn('Ожидание', 'waiting', 'badge-warning')}
        {renderColumn('Вызван', 'called', 'badge-active')}
        {renderColumn('На приеме', 'inprogress', 'badge-active')}
        {renderColumn('Пропущен', 'missed', 'badge-danger')}
      </div>
    </div>
  );
}