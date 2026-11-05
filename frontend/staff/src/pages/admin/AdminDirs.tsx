import { useState } from 'react';

export default function AdminDirs() {
  const [specialties, setSpecialties] = useState(['Терапия', 'Кардиология', 'Педиатрия']);
  const [rooms] = useState([
    { id: 1, number: '101', floor: '1', spec: 'Терапия' },
    { id: 2, number: '102', floor: '1', spec: 'Педиатрия' },
    { id: 3, number: '201', floor: '2', spec: 'УЗИ' },
  ]);

  const removeSpecialty = (spec: string) => {
    setSpecialties(specialties.filter(s => s !== spec));
  };

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Справочники</h1><p className="page-subtitle">Управление специальностями и кабинетами клиники.</p></div>
      </div>
      <div className="admin-grid">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Специальности</h3>
            <button className="btn btn-outline btn-sm">+ Добавить</button>
          </div>
          <div className="flex flex-col gap-2">
            {specialties.map(spec => (
              <div key={spec} className="flex justify-between items-center p-2" style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
                <span className="font-medium">{spec}</span>
                <button className="text-muted" style={{ fontSize: '1.2rem' }} onClick={() => removeSpecialty(spec)}>&times;</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: '1rem', color: 'var(--dark)' }}>Кабинеты</h3>
            <button className="btn btn-outline btn-sm">+ Добавить</button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Номер</th><th>Этаж</th><th>Специальность</th><th></th></tr></thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id}>
                    <td className="font-medium">{room.number}</td>
                    <td>{room.floor}</td>
                    <td>{room.spec}</td>
                    <td><button className="text-muted" style={{ fontSize: '1.2rem' }}>&times;</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}