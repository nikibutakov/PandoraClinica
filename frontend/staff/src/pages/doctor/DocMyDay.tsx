import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  type DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Patient {
  id: string;
  name: string;
  time: string;
  type: string;
  status: 'waiting' | 'called' | 'inprogress' | 'missed';
}

// --- КОМПОНЕНТ ПЕРЕТАСКИВАЕМОЙ КАРТОЧКИ ---
function DraggableCard({ 
  patient, 
  onMove, 
  onOpen 
}: { 
  patient: Patient; 
  onMove: (id: string, status: Patient['status']) => void; 
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: patient.id,
  });

  // Объединяем стили перетаскивания и кастомную рамку
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    borderLeft: patient.status === 'missed' ? '2px solid var(--danger)' : 'none'
  };

  return (
    <div 
      ref={setNodeRef} 
      className="kanban-card" 
      style={style} // Оставлен только один пропс style
    >
      {/* Область за которую можно тянуть (вся карточка, но кнопки перехватывают клик) */}
      <div {...listeners} {...attributes}>
        <div className="flex justify-between items-start mb-2">
          <div className="font-semibold text-dark text-sm">{patient.name}</div>
          <div className="text-xs text-muted font-medium">{patient.time}</div>
        </div>
        <div className="text-xs text-muted mb-3">{patient.type}</div>
      </div>
      
      {patient.status === 'waiting' && (
        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 1, padding: 4, fontSize: '0.75rem' }} onClick={() => onMove(patient.id, 'called')}>Вызвать</button>
          <button className="btn btn-danger-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => onMove(patient.id, 'missed')}>Пропуск</button>
        </div>
      )}
      {patient.status === 'inprogress' && (
        <button className="btn btn-primary w-100" style={{ padding: 6 }} onClick={onOpen}>Открыть</button>
      )}
      {patient.status === 'missed' && (
        <button className="btn btn-outline w-100" style={{ padding: 4, fontSize: '0.75rem' }} onClick={() => onMove(patient.id, 'waiting')}>Вернуть</button>
      )}
      {patient.status === 'called' && (
        <div className="text-xs text-primary font-medium mt-2">Направлен в каб. 101</div>
      )}
    </div>
  );
}

// --- КОМПОНЕНТ КОЛОНКИ (ЗОНЫ СБРОСА) ---
function DroppableColumn({ 
  id, 
  title, 
  badgeClass, 
  patients, 
  onMove, 
  onOpen 
}: { 
  id: Patient['status']; 
  title: string; 
  badgeClass: string; 
  patients: Patient[]; 
  onMove: (id: string, status: Patient['status']) => void; 
  onOpen: () => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="kanban-col">
      <div className="kanban-header">
        <span>{title}</span>
        <span className={`badge ${badgeClass}`}>{patients.length}</span>
      </div>
      {patients.map(p => (
        <DraggableCard 
          key={p.id} 
          patient={p} 
          onMove={onMove} 
          onOpen={onOpen} 
        />
      ))}
    </div>
  );
}

// --- ОСНОВНАЯ СТРАНИЦА ---
export default function DocMyDay() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([
    { id: 'w1', name: 'Белла Фомина', time: '10:40', type: 'Повторный', status: 'waiting' },
    { id: 'w2', name: 'Даниил Лебедев', time: '11:00', type: 'Консультация', status: 'waiting' },
    { id: 'ip1', name: 'Анна Смирнова', time: '10:00', type: 'Первичный', status: 'inprogress' },
    { id: 'm1', name: 'Лев Переверзев', time: '09:40', type: 'Повторный', status: 'missed' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Перетаскивание начнется только если сдвинуть мышь на 5 пикселей
      },
    }),
    useSensor(KeyboardSensor)
  );

  const movePatient = (id: string, newStatus: Patient['status']) => {
    setPatients(patients.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const getPatientsByStatus = (status: Patient['status']) => patients.filter(p => p.status === status);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string; 
    
    let newStatus: Patient['status'] = 'waiting';
    if (['waiting', 'called', 'inprogress', 'missed'].includes(overId)) {
      newStatus = overId as Patient['status'];
    } else {
      const targetPatient = patients.find(p => p.id === overId);
      if (targetPatient) newStatus = targetPatient.status;
    }

    const activePatient = patients.find(p => p.id === activeId);
    if (activePatient && activePatient.status !== newStatus) {
      movePatient(activeId, newStatus);
    }
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          <DroppableColumn id="waiting" title="Ожидание" badgeClass="badge-warning" patients={getPatientsByStatus('waiting')} onMove={movePatient} onOpen={() => navigate('/staff/doc/record')} />
          <DroppableColumn id="called" title="Вызван" badgeClass="badge-active" patients={getPatientsByStatus('called')} onMove={movePatient} onOpen={() => navigate('/staff/doc/record')} />
          <DroppableColumn id="inprogress" title="На приеме" badgeClass="badge-active" patients={getPatientsByStatus('inprogress')} onMove={movePatient} onOpen={() => navigate('/staff/doc/record')} />
          <DroppableColumn id="missed" title="Пропущен" badgeClass="badge-danger" patients={getPatientsByStatus('missed')} onMove={movePatient} onOpen={() => navigate('/staff/doc/record')} />
        </div>
      </DndContext>
    </div>
  );
}