import { useState } from 'react';
import { Modal } from 'antd';

export default function RegPatients() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const openPatient = (patient: any) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Пациенты</h1><p className="page-subtitle">Поиск, регистрация и управление картами пациентов.</p></div>
      </div>
      
      {/* Поисковая строка */}
      <div className="search-bar">
        <input type="text" className="input-field" placeholder="Поиск по СНИЛС, ФИО или телефону..." />
        <button className="btn btn-primary">Найти</button>
      </div>

      <div className="patient-layout">
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--dark)', marginBottom: 12 }}>Недавние</h3>
          <div className="recent-patients">
            
            <div className="patient-list-item" onClick={() => openPatient({ fio: 'Мария Петрова', citizenship: 'РФ', snils: '287-641-905', doctor: 'Анна Иванова', phone: '913 555-01-88' })}>
              <div className="patient-info">
                <div className="avatar">МП</div>
                <div className="patient-text">
                  <div className="font-medium text-dark text-sm">Мария Петрова</div>
                  <div className="text-xs text-muted">СНИЛС 287-641-905</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
            
            <div className="patient-list-item warning" onClick={() => openPatient({ fio: 'Неизвестный (Экстренный)', citizenship: 'Не указано', snils: 'НЕТ ДАННЫХ', doctor: 'Дежурный врач', phone: 'НЕТ ДАННЫХ' })}>
              <div className="patient-info">
                <div className="avatar" style={{ background: 'var(--danger)', color: 'white' }}>!</div>
                <div className="patient-text">
                  <div className="font-medium text-danger text-sm">Без СНИЛС</div>
                  <div className="text-xs" style={{ color: 'var(--danger)', opacity: 0.8 }}>Требует заполнения</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>

          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', color: 'var(--dark)' }}>Новый пациент</h2>
            <button className="btn btn-danger-outline">+ Приём без СНИЛС</button>
          </div>
          <div className="form-grid">
            <div className="input-group" style={{ gridColumn: 'span 2' }}><label>ФИО *</label><input type="text" className="input-field" placeholder="Иванов Иван Иванович" /></div>
            <div className="input-group"><label>Гражданство *</label><select className="input-field"><option>РФ</option><option>Не-РФ</option></select></div>
            <div className="input-group"><label>СНИЛС *</label><input type="text" className="input-field" placeholder="123-456-789 00" /></div>
            <div className="input-group"><label>Телефон</label><input type="text" className="input-field" placeholder="+7 (___) ___-__-__" /></div>
            <div className="input-group"><label>Выбор врача *</label><select className="input-field"><option>Анна Иванова (Терапия)</option><option>Елена Соколова (Педиатрия)</option></select></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-outline">Очистить</button>
            <button className="btn btn-primary">Зарегистрировать</button>
          </div>
        </div>
      </div>

      <Modal title="Карточка пациента" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => setIsModalOpen(false)} okText="Сохранить" cancelText="Отмена">
        {selectedPatient && (
          <div className="form-grid mt-4">
            <div className="input-group" style={{ gridColumn: 'span 2' }}><label>ФИО</label><input type="text" className="input-field" defaultValue={selectedPatient.fio} /></div>
            <div className="input-group"><label>Гражданство</label><input type="text" className="input-field" defaultValue={selectedPatient.citizenship} /></div>
            <div className="input-group"><label>СНИЛС</label><input type="text" className="input-field" defaultValue={selectedPatient.snils} /></div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}><label>Врач</label><input type="text" className="input-field" defaultValue={selectedPatient.doctor} /></div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}><label>Телефон</label><input type="text" className="input-field" defaultValue={selectedPatient.phone} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}