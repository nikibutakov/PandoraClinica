import { useState } from 'react';
import { Modal, Form, Input, Select, message, Popconfirm, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

// Определяем интерфейс для сотрудника
interface StaffMember {
  id: number;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'blocked';
  initials: string;
}

export default function AdminStaff() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Состояние с данными сотрудников
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: 1, name: 'Елена Смирнова', role: 'Регистратор', email: 'smirnova@pandora.clinic', status: 'active', initials: 'ЕС' },
    { id: 2, name: 'Игорь Петров', role: 'Регистратор', email: 'petrov@pandora.clinic', status: 'blocked', initials: 'ИП' },
  ]);

  // Функция переключения статуса
  const toggleUserStatus = (id: number) => {
    const userToToggle = staff.find((u) => u.id === id);
    if (!userToToggle) return;

    const newStatus = userToToggle.status === 'active' ? 'blocked' : 'active';

    message.success(
      `Сотрудник ${userToToggle.name} ${newStatus === 'active' ? 'разблокирован' : 'заблокирован'}`
    );

    setStaff((prevStaff) =>
      prevStaff.map((user) =>
        user.id === id ? { ...user, status: newStatus } : user
      )
    );
  };

  // Функция удаления сотрудника
  const handleDeleteUser = (id: number) => {
    const userToDelete = staff.find((u) => u.id === id);
    setStaff((prevStaff) => prevStaff.filter((user) => user.id !== id));
    message.success(`Сотрудник ${userToDelete?.name} удален`);
  };

  // Функция создания сотрудника
  const handleCreateUser = (values: any) => {
    const newUser: StaffMember = {
      id: Date.now(),
      name: values.name,
      role: values.role,
      email: values.email,
      status: 'active',
      initials: values.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    };
    
    setStaff((prev) => [...prev, newUser]);
    setIsModalOpen(false);
    form.resetFields();
    message.success('Сотрудник успешно создан');
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Персонал</h1>
          <p className="page-subtitle">Управление учётными записями регистраторов и администраторов.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Создать пользователя
        </button>
      </div>
      
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Роль</th>
                <th>Email</th>
                <th>Статус</th>
                <th style={{ width: '300px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div 
                        className="avatar" 
                        style={user.status === 'blocked' ? { background: '#E5E7EB', color: '#6B7280' } : {}}
                      >
                        {user.initials}
                      </div>
                      <div className="font-medium text-dark">{user.name}</div>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td className="text-muted">{user.email}</td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-done'}`}>
                      {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td>
                    {/* Используем Space из AntD для аккуратного выравнивания кнопок */}
                    <Space size="small" wrap>
                      <button 
                        className="btn btn-outline btn-sm" 
                        disabled={user.status === 'blocked'}
                      >
                        Сбросить пароль
                      </button>
                      
                      <button 
                        className={`btn ${user.status === 'active' ? 'btn-danger-outline' : 'btn-primary'} btn-sm`} 
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === 'active' ? 'Блокировать' : 'Разблокировать'}
                      </button>

                      {/* Кнопка удаления с подтверждением */}
                      <Popconfirm
                        title="Удалить сотрудника?"
                        description="Это действие нельзя отменить."
                        onConfirm={() => handleDeleteUser(user.id)}
                        okText="Удалить"
                        cancelText="Отмена"
                        okButtonProps={{ danger: true }}
                      >
                        <button className="btn btn-danger-outline btn-sm" title="Удалить">
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

      {/* Модалка создания (AntD) */}
      <Modal 
        title="Новый сотрудник" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()} 
        okText="Создать" 
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateUser} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="ФИО" rules={[{ required: true, message: 'Введите ФИО' }]}>
            <Input placeholder="Иванов Иван" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input placeholder="example@pandora.clinic" />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
            <Select placeholder="Выберите роль">
              <Select.Option value="Регистратор">Регистратор</Select.Option>
              <Select.Option value="Админ">Админ</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}