import { useState } from 'react';
import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function DocRecord() {
  const navigate = useNavigate();
  
  // Состояние для активной вкладки
  const [activeTab, setActiveTab] = useState<'karta' | 'history' | 'docs'>('karta');
  
  // Состояние для модального окна направления
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Приём / Медицинская карта</h1>
          <p className="page-subtitle">Пациент: Анна Смирнова · Терапия</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/staff/doc/myday')}>Назад</button>
      </div>
      
      <div className="record-layout">
        {/* Левая колонка с информацией о пациенте */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>АС</div>
              <div>
                <div className="font-bold text-dark" style={{ fontSize: '1rem' }}>Анна Смирнова</div>
                <div className="text-xs text-muted">42 года · Ж</div>
              </div>
            </div>
            <div className="info-row">
              <span className="text-muted">СНИЛС</span>
              <span className="font-medium">245-803-716 00</span>
            </div>
            <div className="info-row">
              <span className="text-muted">Телефон</span>
              <span className="font-medium">+7 (913) 555-01-44</span>
            </div>
          </div>
          
          <div className="card">
            <h4 className="font-semibold text-dark mb-2 text-sm">Аллергии</h4>
            <p className="text-sm text-dark mb-2">Нет известных.</p>
          </div>
        </div>

        {/* Правая колонка с вкладками */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          
          {/* Кастомные вкладки */}
          <div className="tabs">
            <div 
              className={`tab ${activeTab === 'karta' ? 'active' : ''}`} 
              onClick={() => setActiveTab('karta')}
            >
              Карта
            </div>
            <div 
              className={`tab ${activeTab === 'history' ? 'active' : ''}`} 
              onClick={() => setActiveTab('history')}
            >
              История
            </div>
            <div 
              className={`tab ${activeTab === 'docs' ? 'active' : ''}`} 
              onClick={() => setActiveTab('docs')}
            >
              Документы
            </div>
          </div>

          {/* Контент вкладок */}
          <div style={{ padding: 16, flexGrow: 1 }}>
            
            {/* Вкладка: Карта */}
            {activeTab === 'karta' && (
              <div>
                <div className="mb-4">
                  <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Жалобы</label>
                  <textarea className="input-field" rows={3} defaultValue="Головная боль в течение 3 дней."></textarea>
                </div>
                <div className="mb-4">
                  <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Основной диагноз (МКБ-10)</label>
                  <input type="text" className="input-field" placeholder="Поиск..." defaultValue="R51.9 Головная боль" />
                </div>
                <div className="mb-4">
                  <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Сопутствующий диагноз</label>
                  <input type="text" className="input-field" placeholder="Поиск..." />
                </div>
                <div className="mb-4">
                  <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Рекомендации</label>
                  <textarea className="input-field" rows={3} defaultValue="Гидратация, режим сна."></textarea>
                </div>
              </div>
            )}

            {/* Вкладка: История */}
            {activeTab === 'history' && (
              <div>
                <h4 className="font-semibold text-dark mb-3">История визитов</h4>
                <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: 16, marginBottom: 16 }}>
                  <div className="text-xs text-muted font-medium mb-1">12 Мая 2026 · Терапия</div>
                  <div className="text-sm font-medium text-dark">ОРВИ</div>
                </div>
              </div>
            )}

            {/* Вкладка: Документы */}
            {activeTab === 'docs' && (
              <div>
                <h4 className="font-semibold text-dark mb-3">Документы</h4>
                <div className="flex justify-between items-center p-2" style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div className="text-sm font-medium text-dark">Анализы_крови.pdf</div>
                  <button className="btn btn-outline btn-sm">Скачать</button>
                </div>
              </div>
            )}

          </div>

          {/* Нижняя панель с кнопками действий */}
          <div className="flex justify-between items-center p-4" style={{ borderTop: '1px solid var(--border)', background: '#FAFAFA', borderRadius: '0 0 10px 10px' }}>
            <button className="btn btn-outline" onClick={() => setIsReferralOpen(true)}>Направление</button>
            <div className="flex gap-2">
              <button className="btn btn-outline">Черновик</button>
              <button className="btn btn-primary">Завершить</button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно для направления */}
      <Modal 
        title="Направление" 
        open={isReferralOpen} 
        onCancel={() => setIsReferralOpen(false)} 
        onOk={() => setIsReferralOpen(false)} 
        okText="Направить" 
        cancelText="Отмена"
      >
        <div className="input-group mt-4">
          <label>Специальность</label>
          <select className="input-field">
            <option value="">-- Выберите --</option>
            <option>Кардиология</option>
            <option>Неврология</option>
            <option>Гастроэнтерология</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}