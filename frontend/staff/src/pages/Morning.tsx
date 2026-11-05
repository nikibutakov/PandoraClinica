/** Утренний экран смены регистратуры (E1): кто ожидается, закрепление за кабинетами. */

import { useEffect, useState } from "react";
import { App, Button, Card, Modal, Select, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type MorningOut = components["schemas"]["MorningOut"];
type MorningDoctor = components["schemas"]["MorningDoctor"];
type MorningOccupied = components["schemas"]["MorningOccupied"];
type RoomOut = components["schemas"]["RoomOut"];

const hhmm = (iso: string | null) => (iso ? iso.slice(11, 16) : "—");

/** «9:00–14:00» — из «09:00:00» бэкенда, без ведущих нулей и секунд. */
function formatWindow(w: { start_time: string; end_time: string }): string {
  const short = (t: string) => t.slice(0, 5).replace(/^0/, "");
  return `${short(w.start_time)}–${short(w.end_time)}`;
}

export default function Morning() {
  const { message } = App.useApp();
  const [data, setData] = useState<MorningOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // кнопки «Повторить»/после закрепления увеличивают счётчик — эффект перезагружает
  const [reloadCount, setReloadCount] = useState(0);
  // врач, для которого открыт модал закрепления
  const [assigning, setAssigning] = useState<MorningDoctor | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: body, error: errBody, response } = await api.GET(
        "/api/registrar/morning",
      );
      if (cancelled) return;
      if (body) {
        setData(body);
        setError("");
      } else {
        setError(formatApiError(errBody, response.status));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const reload = () => setReloadCount((n) => n + 1);

  const assign = async () => {
    if (!assigning || roomId === null) return;
    setSaving(true);
    const { data: workday, error: body, response } = await api.POST(
      "/api/registrar/workdays",
      { body: { doctor_id: assigning.doctor_id, room_id: roomId } },
    );
    setSaving(false);
    if (workday) {
      message.success(
        `${assigning.full_name} закреплён за кабинетом (смена открыта)`,
      );
      setAssigning(null);
      setRoomId(null);
      reload();
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const expectedColumns: ColumnsType<MorningDoctor> = [
    { title: "Врач", dataIndex: "full_name" },
    { title: "Специальность", dataIndex: "specialization_name" },
    {
      title: "Приём по графику",
      dataIndex: "windows",
      render: (windows: MorningDoctor["windows"]) =>
        windows.map((w, i) => (
          <Tag key={i}>{formatWindow(w)}</Tag>
        )),
    },
    {
      title: "",
      key: "action",
      width: 140,
      render: (_, doctor) => (
        <Button
          type="primary"
          onClick={() => {
            setAssigning(doctor);
            setRoomId(null);
          }}
        >
          Закрепить кабинет
        </Button>
      ),
    },
  ];

  const occupiedColumns: ColumnsType<MorningOccupied> = [
    { title: "Кабинет", dataIndex: "room_number", width: 100 },
    { title: "Врач", dataIndex: "full_name" },
    { title: "Специальность", dataIndex: "specialization_name" },
    {
      title: "Смена с",
      dataIndex: "started_at",
      width: 100,
      render: (iso: string | null) => hhmm(iso),
    },
  ];

  if (loading) return <Spin size="large" style={{ display: "block", margin: 80 }} />;
  if (error) return <Typography.Text type="danger">{error}</Typography.Text>;
  if (!data) return null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Утренний экран · {dayjs(data.date).format("DD.MM.YYYY")}
      </Typography.Title>

      <Card title="Закреплены за кабинетами" size="small">
        <Table
          rowKey="workday_id"
          size="small"
          columns={occupiedColumns}
          dataSource={data.occupied}
          pagination={false}
          locale={{ emptyText: "Пока никого — закрепите врачей ниже" }}
        />
      </Card>

      <Card title="Ожидается сегодня по графику" size="small">
        <Table
          rowKey="doctor_id"
          size="small"
          columns={expectedColumns}
          dataSource={data.expected}
          pagination={false}
          locale={{ emptyText: "На сегодня графиков нет" }}
        />
      </Card>

      <Card title="Свободные кабинеты" size="small">
        {data.free_rooms.length === 0 ? (
          <Typography.Text type="secondary">
            Все кабинеты заняты
          </Typography.Text>
        ) : (
          <Space wrap>
            {data.free_rooms.map((room: RoomOut) => (
              <Tag key={room.id}>
                № {room.number}
                {room.specialization_name ? ` · ${room.specialization_name}` : " · универсальный"}
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      <Modal
        title={`Закрепить: ${assigning?.full_name ?? ""}`}
        open={assigning !== null}
        okText="Закрепить"
        cancelText="Отмена"
        confirmLoading={saving}
        okButtonProps={{ disabled: roomId === null }}
        onOk={() => void assign()}
        onCancel={() => setAssigning(null)}
      >
        <Typography.Paragraph type="secondary">
          Специальность: {assigning?.specialization_name}. Профильный кабинет
          другой специальности выбрать нельзя — бэкенд это проверит.
        </Typography.Paragraph>
        <Select
          style={{ width: "100%" }}
          placeholder="Выберите кабинет"
          value={roomId}
          onChange={setRoomId}
          options={data.free_rooms.map((room) => ({
            value: room.id,
            label: `Кабинет ${room.number}${room.specialization_name ? ` · ${room.specialization_name}` : " · универсальный"}`,
            // профильный кабинет чужой специальности — сразу недоступен
            disabled:
              room.specialization_id !== null &&
              room.specialization_id !== assigning?.specialization_id,
          }))}
        />
      </Modal>
    </Space>
  );
}
