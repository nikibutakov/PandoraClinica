import { useState, useEffect } from 'react';

interface CalledPatient {
  ticket: string;
  room: string;
  doctor: string;
}

interface QueueItem {
  id: string;
  ticket: string;
  name: string;
}

export default function Board() {
  const [called, setCalled] = useState<CalledPatient | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Функция получения данных из localStorage
  const fetchData = () => {
    const savedCalled = localStorage.getItem('board_called');
    const savedQueue = localStorage.getItem('board_queue');

    if (savedCalled) {
      setCalled(JSON.parse(savedCalled));
    } else {
      // Демо-данные для первоначального вида
      setCalled({ ticket: 'G-019', room: '101', doctor: 'Анна Иванова' });
    }

    if (savedQueue) {
      setQueue(JSON.parse(savedQueue));
    } else {
      setQueue([
        { id: '1', ticket: 'G-020', name: 'Белла' },
        { id: '2', ticket: 'G-021', name: 'Даниил' },
        { id: '3', ticket: 'G-022', name: 'Мария' },
      ]);
    }
  };

  useEffect(() => {
    // Инициализация при загрузке
    fetchData();

    // Автообновление данных каждые 5 секунд
    const dataInterval = setInterval(fetchData, 5000);

    // Обновление часов каждую секунду
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <div className="board-container">
      <div className="board-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 60, height: 60, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2.5rem' }}>+</div>
          <div>
            <div style={{ fontWeight: 700, lineHeight: 1 }}>Pandora</div>
            <div style={{ fontSize: '1rem', letterSpacing: 3, color: 'var(--text-muted)' }}>ПОЛИКЛИНИКА</div>
          </div>
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '3rem', fontWeight: 300 }}>
          {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="board-content">
        {/* Блок вызванного пациента */}
        <div className="board-called-box">
          <div style={{ fontSize: '2rem', textTransform: 'uppercase', letterSpacing: 4, opacity: 0.8, marginBottom: 20 }}>
            Приглашается
          </div>
          {called ? (
            <>
              <div className="board-called-ticket">{called.ticket}</div>
              <div className="board-called-room">Кабинет {called.room}</div>
            </>
          ) : (
            <div style={{ fontSize: '4rem', fontWeight: 600 }}>Ожидайте</div>
          )}
        </div>

        {/* Очередь */}
        <div className="board-queue-list">
          <div className="board-queue-title">Следующие</div>
          {queue.map((item, index) => (
            <div key={item.id} className="board-queue-item">
              <span style={{ color: index === 0 ? 'var(--primary)' : 'white', fontWeight: 700 }}>{item.ticket}</span>
              <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{item.name}</span>
            </div>
          ))}
          {queue.length === 0 && (
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Очередь пуста</div>
          )}
        </div>
      </div>
    </div>
  );
}