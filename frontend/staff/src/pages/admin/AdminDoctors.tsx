import { useState } from 'react';
import { Modal } from 'antd';

export default function AdminDoctors() {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const doctors = [
    { id: 1, name: 'Анна Иванова', spec: 'Терапия', initials: 'АИ', status: 'active' },
    { id: 2, name: 'Роман Лебедев', spec: 'УЗИ', initials: 'РЛ', status: 'active' },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Врачи и график</h1><p className="page-subtitle">Управление штатом врачей и настройка недельных шаблонов.</p></div>
        <button className="btn btn-primary">+ Нанять врача</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Врач</th><th>Специальность</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {doctors.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{doc.initials}</div>
                      <div className="font-medium text-dark">{doc.name}</div>
                    </div>
                  </td>
                  <td>{doc.spec}</td>
                  <td><span className="badge badge-active">Активен</span></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => setIsScheduleOpen(true)}>График</button>
                    <button className="btn btn-danger-outline btn-sm" style={{ marginLeft: 8 }}>Деактивировать</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        title="График: Анна Иванова" 
        open={isScheduleOpen} 
        onCancel={() => setIsScheduleOpen(false)} 
        onOk={() => setIsScheduleOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, marginTop: 16 }}>
          <div className="schedule-day-row"><span>Пн</span><input type="time" defaultValue="08:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /> - <input type="time" defaultValue="14:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /><button className="text-muted" style={{ marginLeft: 8 }}>+</button></div>
          <div className="schedule-day-row"><span>Вт</span><input type="time" defaultValue="08:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /> - <input type="time" defaultValue="14:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /><button className="text-muted" style={{ marginLeft: 8 }}>+</button></div>
          <div className="schedule-day-row"><span>Ср</span><span className="text-muted text-sm" style={{ marginLeft: 8 }}>Выходной</span></div>
          <div className="schedule-day-row"><span>Чт</span><input type="time" defaultValue="08:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /> - <input type="time" defaultValue="14:00" className="input-field" style={{ width: 100, padding: '4px 8px' }} /><button className="text-muted" style={{ marginLeft: 8 }}>+</button></div>
        </div>
      </Modal>
    </div>
  );
}