import { useState } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  Popconfirm, 
  message,
  Row,
  Col
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// --- ТИПЫ ДАННЫХ ---
interface Specialty {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  floor: number;
  specialtyId: string;
}

export default function AdminDirs() {
  // --- СОСТОЯНИЯ ---
  const [specialties, setSpecialties] = useState<Specialty[]>([
    { id: '1', name: 'Терапия' },
    { id: '2', name: 'Кардиология' },
    { id: '3', name: 'Педиатрия' },
    { id: '4', name: 'УЗИ' },
  ]);

  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', number: '101', floor: 1, specialtyId: '1' },
    { id: '2', number: '102', floor: 1, specialtyId: '3' },
    { id: '3', number: '201', floor: 2, specialtyId: '4' },
  ]);

  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  const [specForm] = Form.useForm();
  const [roomForm] = Form.useForm();

  // --- ОБРАБОТЧИКИ ДЛЯ СПЕЦИАЛЬНОСТЕЙ ---
  const handleAddSpecialty = (values: { name: string }) => {
    const newSpec = { id: Date.now().toString(), name: values.name };
    setSpecialties([...specialties, newSpec]);
    setIsSpecModalOpen(false);
    specForm.resetFields();
    message.success('Специальность добавлена');
  };

  const handleDeleteSpecialty = (id: string) => {
    // Проверяем, не используется ли специальность в кабинетах
    const isUsed = rooms.some(r => r.specialtyId === id);
    if (isUsed) {
      message.error('Нельзя удалить специальность, к которой привязаны кабинеты');
      return;
    }
    setSpecialties(specialties.filter(s => s.id !== id));
    message.success('Специальность удалена');
  };

  // --- ОБРАБОТЧИКИ ДЛЯ КАБИНЕТОВ ---
  const handleAddRoom = (values: { number: string; floor: number; specialtyId: string }) => {
    const newRoom = { 
      id: Date.now().toString(), 
      number: values.number, 
      floor: values.floor, 
      specialtyId: values.specialtyId 
    };
    setRooms([...rooms, newRoom]);
    setIsRoomModalOpen(false);
    roomForm.resetFields();
    message.success('Кабинет добавлен');
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
    message.success('Кабинет удален');
  };

  // --- КОЛОНКИ ДЛЯ ТАБЛИЦ ---
  const specialtyColumns: ColumnsType<Specialty> = [
    {
      title: 'Название специальности',
      dataIndex: 'name',
      key: 'name',
      className: 'font-medium',
    },
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'right',
      render: (_, record) => (
        <Popconfirm
          title="Удалить специальность?"
          description="Это действие нельзя отменить."
          onConfirm={() => handleDeleteSpecialty(record.id)}
          okText="Удалить"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const roomColumns: ColumnsType<Room> = [
    {
      title: 'Номер',
      dataIndex: 'number',
      key: 'number',
      className: 'font-medium',
      width: 100,
    },
    {
      title: 'Этаж',
      dataIndex: 'floor',
      key: 'floor',
      width: 100,
    },
    {
      title: 'Специальность',
      dataIndex: 'specialtyId',
      key: 'specialtyId',
      render: (specId: string) => specialties.find(s => s.id === specId)?.name || '—',
    },
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'right',
      render: (_, record) => (
        <Popconfirm
          title="Удалить кабинет?"
          description="Вы уверены, что хотите удалить этот кабинет?"
          onConfirm={() => handleDeleteRoom(record.id)}
          okText="Удалить"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Справочники</h1>
          <p className="page-subtitle">Управление специальностями и кабинетами клиники.</p>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* БЛОК: СПЕЦИАЛЬНОСТИ */}
        <Col xs={24} lg={10}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--dark)', margin: 0 }}>Специальности</h3>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIsSpecModalOpen(true)}>
                Добавить
              </Button>
            </div>
            <Table 
              columns={specialtyColumns} 
              dataSource={specialties} 
              rowKey="id" 
              pagination={false}
              size="middle"
            />
          </div>
        </Col>

        {/* БЛОК: КАБИНЕТЫ */}
        <Col xs={24} lg={14}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--dark)', margin: 0 }}>Кабинеты</h3>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIsRoomModalOpen(true)}>
                Добавить
              </Button>
            </div>
            <Table 
              columns={roomColumns} 
              dataSource={rooms} 
              rowKey="id" 
              pagination={false}
              size="middle"
            />
          </div>
        </Col>
      </Row>

      {/* МОДАЛКА: ДОБАВЛЕНИЕ СПЕЦИАЛЬНОСТИ */}
      <Modal
        title="Новая специальность"
        open={isSpecModalOpen}
        onCancel={() => setIsSpecModalOpen(false)}
        onOk={() => specForm.submit()}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={specForm} layout="vertical" onFinish={handleAddSpecialty} style={{ marginTop: 16 }}>
          <Form.Item 
            name="name" 
            label="Название" 
            rules={[{ required: true, message: 'Введите название специальности' }]}
          >
            <Input placeholder="Например: Неврология" />
          </Form.Item>
        </Form>
      </Modal>

      {/* МОДАЛКА: ДОБАВЛЕНИЕ КАБИНЕТА */}
      <Modal
        title="Новый кабинет"
        open={isRoomModalOpen}
        onCancel={() => setIsRoomModalOpen(false)}
        onOk={() => roomForm.submit()}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom} style={{ marginTop: 16 }}>
          <Form.Item 
            name="number" 
            label="Номер кабинета" 
            rules={[{ required: true, message: 'Введите номер кабинета' }]}
          >
            <Input placeholder="Например: 305" />
          </Form.Item>
          <Form.Item 
            name="floor" 
            label="Этаж" 
            rules={[{ required: true, message: 'Укажите этаж' }]}
          >
            <Input type="number" placeholder="Например: 3" />
          </Form.Item>
          <Form.Item 
            name="specialtyId" 
            label="Специальность" 
            rules={[{ required: true, message: 'Выберите специальность' }]}
          >
            <Select placeholder="Выберите из списка">
              {specialties.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}