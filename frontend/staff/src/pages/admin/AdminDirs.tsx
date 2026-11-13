/**
 * Справочники (админ): специальности и кабинеты (номер + профиль-специальность,
 * NULL = универсальный). Удаления в API нет — справочники только пополняются;
 * кабинет можно изменить (PATCH).
 */

import { useEffect, useState } from "react";
import { App, Form, Input, Modal, Row, Col, Select } from "antd";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type SpecializationOut = components["schemas"]["SpecializationOut"];
type RoomOut = components["schemas"]["RoomOut"];

interface SpecForm {
  name: string;
}

interface RoomForm {
  number: string;
  specialization_id?: number | null;
}

export default function AdminDirs() {
  const { message } = App.useApp();
  const [specialties, setSpecialties] = useState<SpecializationOut[]>([]);
  const [rooms, setRooms] = useState<RoomOut[]>([]);
  const [error, setError] = useState("");

  const [specOpen, setSpecOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  // кабинет в модалке редактирования (null = создание нового)
  const [editingRoom, setEditingRoom] = useState<RoomOut | null>(null);
  const [saving, setSaving] = useState(false);

  const [specForm] = Form.useForm<SpecForm>();
  const [roomForm] = Form.useForm<RoomForm>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [
        { data: specs, error: specErr, response: specResp },
        { data: roomData, error: roomErr, response: roomResp },
      ] = await Promise.all([
        api.GET("/api/admin/specializations"),
        api.GET("/api/admin/rooms"),
      ]);
      if (cancelled) return;
      if (specs) setSpecialties(specs);
      else setError(formatApiError(specErr, specResp.status));
      if (roomData) setRooms(roomData);
      else setError(formatApiError(roomErr, roomResp.status));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addSpecialty = async () => {
    const values = await specForm.validateFields();
    setSaving(true);
    const {
      data,
      error: errBody,
      response,
    } = await api.POST("/api/admin/specializations", {
      body: values,
    });
    setSaving(false);
    if (data) {
      message.success(`Специальность «${data.name}» добавлена`);
      setSpecOpen(false);
      specForm.resetFields();
      const { data: specs } = await api.GET("/api/admin/specializations");
      setSpecialties(specs ?? []);
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const openRoomModal = (room: RoomOut | null) => {
    setEditingRoom(room);
    roomForm.setFieldsValue({
      number: room?.number ?? "",
      specialization_id: room?.specialization_id ?? null,
    });
    setRoomOpen(true);
  };

  const saveRoom = async () => {
    const values = await roomForm.validateFields();
    setSaving(true);
    const body = {
      number: values.number,
      specialization_id: values.specialization_id ?? null,
    };
    const {
      data,
      error: errBody,
      response,
    } = editingRoom
      ? await api.PATCH("/api/admin/rooms/{room_id}", {
          params: { path: { room_id: editingRoom.id } },
          body,
        })
      : await api.POST("/api/admin/rooms", { body });
    setSaving(false);
    if (data) {
      message.success(
        editingRoom
          ? `Кабинет ${data.number} изменён`
          : `Кабинет ${data.number} добавлен`,
      );
      setRoomOpen(false);
      setEditingRoom(null);
      roomForm.resetFields();
      const { data: roomData } = await api.GET("/api/admin/rooms");
      setRooms(roomData ?? []);
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Справочники</h1>
          <p className="page-subtitle">
            Специальности и кабинеты клиники. Универсальный кабинет — без
            профиля.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-danger text-sm" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      <Row gutter={[24, 24]}>
        {/* СПЕЦИАЛЬНОСТИ */}
        <Col xs={24} lg={10}>
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden", height: "100%" }}
          >
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "1rem", color: "var(--dark)", margin: 0 }}>
                Специальности
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setSpecOpen(true)}
              >
                + Добавить
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Название специальности</th>
                  </tr>
                </thead>
                <tbody>
                  {specialties.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.name}</td>
                    </tr>
                  ))}
                  {specialties.length === 0 && (
                    <tr>
                      <td className="text-muted">Специальностей пока нет</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Col>

        {/* КАБИНЕТЫ */}
        <Col xs={24} lg={14}>
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden", height: "100%" }}
          >
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "1rem", color: "var(--dark)", margin: 0 }}>
                Кабинеты
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openRoomModal(null)}
              >
                + Добавить
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Специальность (профиль)</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.number}</td>
                      <td>
                        {r.specialization_name ?? (
                          <span className="text-muted">универсальный</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openRoomModal(r)}
                        >
                          Изменить
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rooms.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-muted">
                        Кабинетов пока нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>

      {/* МОДАЛКА: ДОБАВЛЕНИЕ СПЕЦИАЛЬНОСТИ */}
      <Modal
        title="Новая специальность"
        open={specOpen}
        onCancel={() => setSpecOpen(false)}
        onOk={() => void addSpecialty()}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={saving}
      >
        <Form
          form={specForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: "Введите название специальности" },
            ]}
          >
            <Input placeholder="Например: Неврология" />
          </Form.Item>
        </Form>
      </Modal>

      {/* МОДАЛКА: ДОБАВЛЕНИЕ / ИЗМЕНЕНИЕ КАБИНЕТА */}
      <Modal
        title={editingRoom ? `Кабинет ${editingRoom.number}` : "Новый кабинет"}
        open={roomOpen}
        onCancel={() => {
          setRoomOpen(false);
          setEditingRoom(null);
        }}
        onOk={() => void saveRoom()}
        okText={editingRoom ? "Сохранить" : "Добавить"}
        cancelText="Отмена"
        confirmLoading={saving}
      >
        <Form
          form={roomForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          requiredMark={false}
        >
          <Form.Item
            name="number"
            label="Номер кабинета"
            rules={[{ required: true, message: "Введите номер кабинета" }]}
          >
            <Input placeholder="Например: 305" />
          </Form.Item>
          <Form.Item name="specialization_id" label="Профиль (специальность)">
            <Select
              allowClear
              placeholder="Не задан — универсальный кабинет"
              options={specialties.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <p className="text-xs text-muted">
            Кабинет с профилем подходит только врачам этой специальности;
            универсальный — всем. Удаление кабинетов и специальностей не
            предусмотрено.
          </p>
        </Form>
      </Modal>
    </div>
  );
}
