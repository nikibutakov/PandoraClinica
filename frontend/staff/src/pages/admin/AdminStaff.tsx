import { useState } from 'react';
import { Modal } from 'antd';

export default function AdminStaff() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const staff = [
    { id: 1, name: 'Елена Смирнова', role: 'Регистратор', email: 'smirnova@pandora.clinic', status: 'active', initials: 'ЕС' },
    { id: 2, name: 'Игорь Петров', role: 'Регистратор', email: 'petrov@pandora.clinic', status: 'blocked', initials: 'ИП' },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Персонал</h1>
          <p className="page-subtitle">Управление учётными записями регистраторов и администраторов.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Создать пользователя</button>
      </div>
      
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Сотрудник</th><th>Роль</th><th>Email</th><th>Статус</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {staff.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar" style={user.status === 'blocked' ? { background: '#E5E7EB', color: '#6B7280' } : {}}>{user.initials}</div>
                      <div className="font-medium text-dark">{user.name}</div>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td className="text-muted">{user.email}</td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-done'}`}>
                      {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" disabled={user.status === 'blocked'}>Сбросить пароль</button>
                    <button className={`btn ${user.status === 'active' ? 'btn-danger-outline' : 'btn-primary'} btn-sm`} style={{ marginLeft: 8 }}>
                      {user.status === 'active' ? 'Блокировать' : 'Разблокировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка создания (AntD) */}
      <Modal title="Новый сотрудник" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => setIsModalOpen(false)} okText="Создать" cancelText="Отмена">
        <div className="input-group mt-4"><label>ФИО</label><input type="text" className="input-field" /></div>
        <div className="input-group"><label>Email</label><input type="email" className="input-field" /></div>
        <div className="input-group"><label>Роль</label><select className="input-field"><option>Регистратор</option><option>Админ</option></select></div>
      </Modal>
    </div>
  );
}