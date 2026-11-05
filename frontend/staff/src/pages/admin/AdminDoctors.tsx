import { useState } from 'react';
import { Modal, Switch, TimePicker, Form, Input, Select, message, Popconfirm, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Типы данных
interface Doctor {
  id: number;
  name: string;
  spec: string;
  initials: string;
  status: 'active' | 'inactive';
}

interface DaySchedule {
  day: string;
  isWorking: boolean;
  start: string;
  end: string;
}

export default function AdminDoctors() {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Состояние списка врачей
  const [doctors, setDoctors] = useState<Doctor[]>([
    { id: 1, name: 'Анна Иванова', spec: 'Терапия', initials: 'АИ', status: 'active' },
    { id: 2, name: 'Роман Лебедев', spec: 'УЗИ', initials: 'РЛ', status: 'active' },
  ]);

  // Состояние графика работы (для модалки)
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'Пн', isWorking: true, start: '08:00', end: '14:00' },
    { day: 'Вт', isWorking: true, start: '08:00', end: '14:00' },
    { day: 'Ср', isWorking: false, start: '08:00', end: '14:00' },
    { day: 'Чт', isWorking: true, start: '08:00', end: '14:00' },
    { day: 'Пт', isWorking: true, start: '08:00', end: '14:00' },
    { day: 'Сб', isWorking: false, start: '09:00', end: '13:00' },
    { day: 'Вс', isWorking: false, start: '09:00', end: '13:00' },
  ]);

  // Обработчик найма нового врача
  const handleHireDoctor = (values: any) => {
    const newDoctor: Doctor = {
      id: Date.now(),
      name: values.name,
      spec: values.spec,
      status: 'active',
      initials: values.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    };
    
    setDoctors((prev) => [...prev, newDoctor]);
    setIsHireModalOpen(false);
    form.resetFields();
    message.success(`Врач ${values.name} успешно нанят`);
  };

  // Обработчик увольнения (удаления) врача
  const handleFireDoctor = (id: number) => {
    const doctorToFire = doctors.find((d) => d.id === id);
    setDoctors((prev) => prev.filter((doc) => doc.id !== id));
    message.success(`Врач ${doctorToFire?.name} уволен`);
  };

  // Обработчики для графика
  const toggleDay = (index: number, checked: boolean) => {
    const newSchedule = [...schedule];
    newSchedule[index].isWorking = checked;
    setSchedule(newSchedule);
  };

  const changeTime = (index: number, type: 'start' | 'end', time: string | null) => {
    if (!time) return;
    const newSchedule = [...schedule];
    newSchedule[index][type] = time;
    setSchedule(newSchedule);
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Врачи и график</h1>
          <p className="page-subtitle">Управление штатом врачей и настройка недельных шаблонов.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsHireModalOpen(true)}>
          + Нанять врача
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Врач</th>
                <th>Специальность</th>
                <th>Статус</th>
                <th style={{ width: '250px' }}>Действия</th>
              </tr>
            </thead>
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
                  <td>
                    <span className="badge badge-active">Активен</span>
                  </td>
                  <td>
                    <Space size="small" wrap>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => setIsScheduleOpen(true)}
                      >
                        График
                      </button>
                      
                      <Popconfirm
                        title="Уволить врача?"
                        description="Врач будет удален из системы."
                        onConfirm={() => handleFireDoctor(doc.id)}
                        okText="Уволить"
                        cancelText="Отмена"
                        okButtonProps={{ danger: true }}
                      >
                        <button className="btn btn-danger-outline btn-sm" title="Уволить">
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    </Space>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛКА: НАЙМ ВРАЧА */}
      <Modal 
        title="Найм врача" 
        open={isHireModalOpen} 
        onCancel={() => setIsHireModalOpen(false)} 
        onOk={() => form.submit()} 
        okText="Нанять"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleHireDoctor} style={{ marginTop: 16 }}>
          <Form.Item 
            name="name" 
            label="ФИО Врача" 
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input placeholder="Например: Иванов Иван Иванович" />
          </Form.Item>
          
          <Form.Item 
            name="spec" 
            label="Специальность" 
            rules={[{ required: true, message: 'Выберите специальность' }]}
          >
            <Select placeholder="Выберите специальность">
              <Select.Option value="Терапия">Терапия</Select.Option>
              <Select.Option value="Кардиология">Кардиология</Select.Option>
              <Select.Option value="Педиатрия">Педиатрия</Select.Option>
              <Select.Option value="УЗИ">УЗИ</Select.Option>
              <Select.Option value="Неврология">Неврология</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="contract" 
            label="Номер договора" 
            rules={[{ required: true, message: 'Введите номер договора' }]}
          >
            <Input placeholder="Например: Д-2026/45" />
          </Form.Item>
        </Form>
      </Modal>

      {/* МОДАЛКА: ГРАФИК */}
      <Modal 
        title="График: Анна Иванова" 
        open={isScheduleOpen} 
        onCancel={() => setIsScheduleOpen(false)} 
        onOk={() => {
          setIsScheduleOpen(false);
          message.success('График сохранен');
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <div style={{ background: 'var(--bg-body)', padding: '20px 16px', borderRadius: 8, marginTop: 16 }}>
          {schedule.map((day, index) => (
            <div key={day.day} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <Switch 
                size="small" 
                checked={day.isWorking} 
                onChange={(checked) => toggleDay(index, checked)} 
              />
              <span style={{ width: 30, fontWeight: 500, color: day.isWorking ? 'var(--dark)' : 'var(--text-muted)' }}>
                {day.day}
              </span>
              {day.isWorking ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TimePicker 
                    format="HH:mm" 
                    minuteStep={15}
                    value={dayjs(day.start, 'HH:mm')} 
                    onChange={(time) => changeTime(index, 'start', time ? time.format('HH:mm') : null)} 
                    style={{ width: 100 }}
                  />
                  <span>-</span>
                  <TimePicker 
                    format="HH:mm" 
                    minuteStep={15}
                    value={dayjs(day.end, 'HH:mm')} 
                    onChange={(time) => changeTime(index, 'end', time ? time.format('HH:mm') : null)} 
                    style={{ width: 100 }}
                  />
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Выходной</span>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}