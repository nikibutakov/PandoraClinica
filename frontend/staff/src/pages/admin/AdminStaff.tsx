/**
 * Персонал (админ): учётки регистраторов и администраторов — создание,
 * сброс пароля, блокировка (деактивация вместо удаления — DELETE в API нет).
 */

import { useEffect, useState } from "react";
import { App, Form, Input, Modal, Popconfirm, Select } from "antd";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type UserOut = components["schemas"]["UserOut"];
type UserRole = components["schemas"]["UserRole"];

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  admin: { label: "Админ", className: "badge badge-new" },
  registrar: { label: "Регистратор", className: "badge badge-active" },
  doctor: { label: "Врач", className: "badge badge-done" },
};

interface CreateForm {
  full_name: string;
  login: string;
  password: string;
  role: UserRole;
}

/** Инициалы из ФИО: первые буквы первых двух слов. */
function initials(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

export default function AdminStaff() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<CreateForm>();

  const [resetTarget, setResetTarget] = useState<UserOut | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    const {
      data,
      error: errBody,
      response,
    } = await api.GET("/api/admin/users");
    if (data) {
      setUsers(data);
      setError("");
    } else {
      setError(formatApiError(errBody, response.status));
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await api.GET("/api/admin/users");
      if (cancelled) return;
      setUsers(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const create = async () => {
    const values = await createForm.validateFields();
    setSaving(true);
    const {
      data,
      error: errBody,
      response,
    } = await api.POST("/api/admin/users", {
      body: values,
    });
    setSaving(false);
    if (data) {
      message.success(`Сотрудник «${data.full_name}» создан`);
      setCreateOpen(false);
      createForm.resetFields();
      void load();
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const toggleActive = async (user: UserOut) => {
    const { error: errBody, response } = await api.PATCH(
      "/api/admin/users/{user_id}",
      {
        params: { path: { user_id: user.id } },
        body: { is_active: !user.is_active },
      },
    );
    if (response.ok) {
      message.success(
        user.is_active
          ? `«${user.full_name}» заблокирован — вход в систему закрыт`
          : `«${user.full_name}» разблокирован`,
      );
      void load();
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const resetPassword = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 4) {
      message.warning("Пароль — минимум 4 символа");
      return;
    }
    setResetting(true);
    const { error: errBody, response } = await api.PATCH(
      "/api/admin/users/{user_id}",
      {
        params: { path: { user_id: resetTarget.id } },
        body: { password: newPassword },
      },
    );
    setResetting(false);
    if (response.ok) {
      message.success(`Пароль «${resetTarget.full_name}» изменён`);
      setResetTarget(null);
      setNewPassword("");
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Персонал</h1>
          <p className="page-subtitle">
            Учётные записи регистраторов и администраторов. Врачи заводятся в
            разделе «Врачи и график».
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Создать пользователя
        </button>
      </div>

      {error && (
        <p className="text-danger text-sm" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Роль</th>
                <th>Логин</th>
                <th>Статус</th>
                <th style={{ width: "300px" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Загрузка…
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="avatar"
                        style={
                          user.is_active
                            ? {}
                            : { background: "#E5E7EB", color: "#6B7280" }
                        }
                      >
                        {initials(user.full_name)}
                      </div>
                      <div className="font-medium text-dark">
                        {user.full_name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={ROLE_BADGE[user.role].className}>
                      {ROLE_BADGE[user.role].label}
                    </span>
                  </td>
                  <td className="text-muted">{user.login}</td>
                  <td>
                    <span
                      className={`badge ${user.is_active ? "badge-active" : "badge-done"}`}
                    >
                      {user.is_active ? "Активен" : "Заблокирован"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setResetTarget(user);
                          setNewPassword("");
                        }}
                      >
                        Сбросить пароль
                      </button>

                      {user.is_active ? (
                        <Popconfirm
                          title="Заблокировать сотрудника?"
                          description="Он не сможет войти в систему, пока не разблокирован."
                          onConfirm={() => void toggleActive(user)}
                          okText="Заблокировать"
                          cancelText="Отмена"
                          okButtonProps={{ danger: true }}
                        >
                          <button className="btn btn-danger-outline btn-sm">
                            Блокировать
                          </button>
                        </Popconfirm>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => void toggleActive(user)}
                        >
                          Разблокировать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Сотрудников нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Создание сотрудника */}
      <Modal
        title="Новый сотрудник"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void create()}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={saving}
      >
        <Form
          form={createForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          requiredMark={false}
        >
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: "Введите ФИО" }]}
          >
            <Input placeholder="Смирнова Елена Андреевна" />
          </Form.Item>
          <Form.Item
            name="login"
            label="Логин"
            rules={[{ required: true, message: "Введите логин" }]}
          >
            <Input placeholder="smirnova" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, min: 4, message: "Минимум 4 символа" }]}
          >
            <Input.Password
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
            <Select
              placeholder="Выберите роль"
              options={[
                { value: "registrar", label: "Регистратор" },
                { value: "admin", label: "Админ" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Сброс пароля */}
      <Modal
        title={`Сбросить пароль: ${resetTarget?.full_name ?? ""}`}
        open={resetTarget !== null}
        onCancel={() => setResetTarget(null)}
        onOk={() => void resetPassword()}
        okText="Сменить пароль"
        cancelText="Отмена"
        confirmLoading={resetting}
      >
        <div className="input-group mt-4">
          <label>Новый пароль (минимум 4 символа)</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-muted">
          Скажите новый пароль сотруднику лично — больше он нигде не
          отображается.
        </p>
      </Modal>
    </div>
  );
}
