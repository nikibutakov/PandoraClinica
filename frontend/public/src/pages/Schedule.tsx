import { Link } from 'react-router-dom';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUI } from '../context/UIContext';
import Reveal from '../components/Reveal';

interface DataType {
  key: string;
  specialty: React.ReactNode;
  days: string;
  time: string;
}

export default function Schedule() {
  const { openModal } = useUI();

  const columns: ColumnsType<DataType> = [
    { title: 'Специальность', dataIndex: 'specialty', key: 'specialty' },
    { title: 'Дни', dataIndex: 'days', key: 'days' },
    {
      title: 'Время',
      dataIndex: 'time',
      key: 'time',
      render: (text: string) => <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{text}</span>,
    },
  ];

  const data: DataType[] = [
    {
      key: '1',
      specialty: (
        <div className="specialty-cell">
          <div className="specialty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div>
          <div className="specialty-info"><h4>Терапевт</h4><p>Общая медицина · Взрослые</p></div>
        </div>
      ),
      days: 'Понедельник – Пятница',
      time: '09:00 – 18:00',
    },
    {
      key: '2',
      specialty: (
        <div className="specialty-cell">
          <div className="specialty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
          <div className="specialty-info"><h4>Кардиолог</h4><p>Консультации по здоровью сердца</p></div>
        </div>
      ),
      days: 'Понедельник, Среда, Пятница',
      time: '10:00 – 17:00',
    },
    {
      key: '3',
      specialty: (
        <div className="specialty-cell">
          <div className="specialty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
          <div className="specialty-info"><h4>Педиатр</h4><p>Дети и подростки</p></div>
        </div>
      ),
      days: 'Понедельник – Суббота',
      time: '09:00 – 16:00',
    },
    {
      key: '4',
      specialty: (
        <div className="specialty-cell">
          <div className="specialty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg></div>
          <div className="specialty-info"><h4>Гинеколог</h4><p>Женское здоровье</p></div>
        </div>
      ),
      days: 'Вторник, Четверг, Суббота',
      time: '10:00 – 16:00',
    },
    {
      key: '5',
      specialty: (
        <div className="specialty-cell">
          <div className="specialty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
          <div className="specialty-info"><h4>Диагностика</h4><p>Анализы и проверки</p></div>
        </div>
      ),
      days: 'Понедельник – Суббота',
      time: '08:00 – 14:00',
    },
  ];

  return (
    <div className="page">
      <div className="container" style={{ paddingBottom: 80 }}>
        <div className="breadcrumbs">
          <Link to="/">Главная</Link> / График работы
        </div>
        <div className="tag">Спланируйте визит</div>
        <h1 style={{ marginBottom: 20 }}>Расписание приемов</h1>
        <p className="subtitle" style={{ maxWidth: 800, marginBottom: 40 }}>
          Найдите время для нужной вам помощи. Ресепшн поможет вам выбрать специальность и подтвердить запись.
        </p>

        <Reveal className="schedule-container" style={{ padding: 0 }}>
          <div className="schedule-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Найдите свою специальность
            </h3>
            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500 }}>
              Прием по записи
            </span>
          </div>
          
          <Table 
            columns={columns} 
            dataSource={data} 
            pagination={false} 
            style={{ borderRadius: '0 0 24px 24px', overflow: 'hidden' }}
          />
        </Reveal>

        <Reveal className="cta-banner" style={{ background: 'var(--primary-light)' }}>
          <div className="cta-content">
            <h2 style={{ color: 'var(--dark)' }}>Давайте найдем время, которое вам подходит.</h2>
            <p style={{ color: 'var(--text-muted)' }}>Не знаете, к какому специалисту обратиться? Начните с разговора с ресепшн.</p>
          </div>
          <div className="cta-actions">
            <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={openModal}>
              Записаться на прием ↗
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}