import { useState } from 'react';
import { AutoComplete, Tabs, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';

const icdOptions = [
  { value: 'R51.9 Головная боль' },
  { value: 'G44.2 Головная боль напряжения' },
  { value: 'H52.1 Миопия' },
];

export default function DocRecord() {
  const navigate = useNavigate();
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const tabItems = [
    {
      key: '1',
      label: 'Карта',
      children: (
        <div style={{ paddingTop: 16 }}>
          <div className="mb-4"><label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Жалобы</label><textarea className="input-field" rows={2} defaultValue="Головная боль в течение 3 дней."></textarea></div>
          <div className="mb-4">
            <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Основной диагноз (МКБ-10)</label>
            <AutoComplete options={icdOptions} style={{ width: '100%' }} placeholder="Поиск..." filterOption={(inputValue, option) => option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1} />
            <div className="mt-2"><span className="icd-tag">R51.9 Головная боль <span>×</span></span></div>
          </div>
          <div className="mb-4">
            <label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Сопутствующий диагноз</label>
            <AutoComplete options={icdOptions} style={{ width: '100%' }} placeholder="Поиск..." filterOption={(inputValue, option) => option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1} />
          </div>
          <div className="mb-4"><label className="font-medium text-dark text-sm mb-1" style={{ display: 'block' }}>Рекомендации</label><textarea className="input-field" rows={2} defaultValue="Гидратация, режим сна."></textarea></div>
        </div>
      ),
    },
    {
      key: '2',
      label: 'История',
      children: (
        <div style={{ paddingTop: 16 }}>
          <h4 className="font-semibold text-dark mb-3">История визитов</h4>
          <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: 16, marginBottom: 16 }}>
            <div className="text-xs text-muted font-medium mb-1">12 Мая 2026 · Терапия</div>
            <div className="text-sm font-medium text-dark">ОРВИ</div>
          </div>
        </div>
      ),
    },
    {
      key: '3',
      label: 'Документы',
      children: (
        <div style={{ paddingTop: 16 }}>
          <h4 className="font-semibold text-dark mb-3">Документы</h4>
          <div className="flex justify-between items-center p-2" style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
            <div className="text-sm font-medium text-dark">Анализы_крови.pdf</div>
            <button className="btn btn-outline btn-sm">Скачать</button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Приём / Медицинская карта</h1><p className="page-subtitle">Пациент: Анна Смирнова · Терапия</p></div>
        <button className="btn btn-outline" onClick={() => navigate('/staff/doc/myday')}>Назад</button>
      </div>
      
      <div className="record-layout">
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>АС</div>
              <div><div className="font-bold text-dark" style={{ fontSize: '1rem' }}>Анна Смирнова</div><div className="text-xs text-muted">42 года · Ж</div></div>
            </div>
            <div className="info-row"><span className="text-muted">СНИЛС</span><span className="font-medium">245-803-716 00</span></div>
            <div className="info-row"><span className="text-muted">Телефон</span><span className="font-medium">+7 (913) 555-01-44</span></div>
          </div>
          <div className="card">
            <h4 className="font-semibold text-dark mb-2 text-sm">Аллергии</h4>
            <p className="text-sm text-dark mb-2">Нет известных.</p>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <Tabs defaultActiveKey="1" items={tabItems} tabBarStyle={{ padding: '0 16px', marginBottom: 0 }} />
          
          <div className="flex justify-between items-center p-4" style={{ borderTop: '1px solid var(--border)', background: '#FAFAFA', borderRadius: '0 0 10px 10px' }}>
            <button className="btn btn-outline" onClick={() => setIsReferralOpen(true)}>Направление</button>
            <div className="flex gap-2"><button className="btn btn-outline">Черновик</button><button className="btn btn-primary">Завершить</button></div>
          </div>
        </div>
      </div>

      <Modal title="Направление" open={isReferralOpen} onCancel={() => setIsReferralOpen(false)} onOk={() => setIsReferralOpen(false)} okText="Направить" cancelText="Отмена">
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