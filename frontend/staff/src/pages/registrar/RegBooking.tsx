import { useState } from 'react';

export default function RegBooking() {
  const [doctor, setDoctor] = useState('Анна Иванова');
  const [spec, setSpec] = useState('Терапия');
  const [date, setDate] = useState('05 Ноября');
  const [time, setTime] = useState('12:20');

  const specialties = [
    { name: 'Терапия', doc: 'Анна Иванова' },
    { name: 'Кардиология', doc: 'Петр Алексеев' },
    { name: 'Педиатрия', doc: 'Елена Соколова' },
  ];

  // Дни текущего месяца для календаря
  const days = Array.from({ length: 15 }, (_, i) => i + 1);
  const times = ['10:40', '11:00', '11:20', '12:20', '12:40'];

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Запись и талоны</h1>
          <p className="page-subtitle">Выберите специальность, врача и время для формирования талона.</p>
        </div>
      </div>
      
      <div className="booking-layout">
        {/* Колонка 1: Специальности */}
        <div className="booking-step">
          <div className="step-title">1. Специальность</div>
          {specialties.map(s => (
            <div 
              key={s.name} 
              className={`care-item ${spec === s.name ? 'active' : ''}`} 
              onClick={() => { setSpec(s.name); setDoctor(s.doc); }}
            >
              <span className={`font-medium ${spec === s.name ? 'text-primary' : 'text-muted'}`}>{s.name}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }}></div>
          <div className="step-title" style={{ fontSize: '0.85rem' }}>Врач:</div>
          <div className="card" style={{ padding: 10, borderColor: 'var(--primary)', marginTop: 8 }}>
            <div className="font-medium text-dark text-sm">Др. {doctor}</div>
            <div className="text-xs text-muted mt-1">{spec}</div>
          </div>
        </div>

        {/* Колонка 2: Время */}
        <div className="booking-step">
          <div className="step-title">2. Дата и время</div>
          <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
            <span>Ноябрь 2026</span>
          </div>
          
          <div className="calendar-mock">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} className="cal-header">{d}</div>
            ))}
            {/* Пустые ячейки для дней прошлого месяца (для ровной сетки) */}
            {[26, 27, 28, 29, 30, 31].map(d => (
              <div key={`prev-${d}`} className="cal-day text-muted">{d}</div>
            ))}
            {/* Дни текущего месяца */}
            {days.map(d => {
              const dateStr = `${d < 10 ? '0'+d : d} Ноября`;
              return (
                <div 
                  key={d} 
                  className={`cal-day ${date === dateStr ? 'active' : ''}`} 
                  onClick={() => setDate(dateStr)}
                >
                  {d}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted mb-2">Доступные слоты:</div>
          <div className="time-slots">
            {times.map(t => (
              <div 
                key={t} 
                className={`time-slot ${time === t ? 'active' : ''} ${t === '10:40' ? 'disabled' : ''}`} 
                onClick={() => t !== '10:40' && setTime(t)}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Колонка 3: Талон */}
        <div className="booking-step" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
          <div className="step-title">3. Талон</div>
          <div className="text-sm text-muted" style={{ marginBottom: 12 }}>Пациент: <b>Мария Петрова</b></div>
          <div style={{ background: 'var(--white)', borderRadius: 6, padding: 16, textAlign: 'center', border: '1px dashed var(--primary)' }}>
            <div className="font-bold text-primary" style={{ fontSize: '1.8rem', marginBottom: 4 }}>G-019</div>
            <div className="text-sm font-medium text-dark">Др. {doctor}</div>
            <div className="text-xs text-muted">{date} · {time}</div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Напечатать талон</button>
        </div>
      </div>
    </div>
  );
}