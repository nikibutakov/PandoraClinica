/**
 * Мой день врача (E5): кабинет, счётчики очереди, вызов пациента,
 * «не дождался», переход к приёму. Очередь обновляется опросом каждые 10 секунд.
 */

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type TodayOut = components["schemas"]["TodayOut"];
type QueueItemOut = components["schemas"]["QueueItemOut"];

const POLL_MS = 10000;

const TICKET_STATUS: Record<
  QueueItemOut["status"],
  { label: string; color: string }
> = {
  waiting: { label: "Ожидает", color: "blue" },
  called: { label: "Вызван", color: "gold" },
  in_progress: { label: "На приёме", color: "processing" },
  done: { label: "Принят", color: "green" },
  skipped: { label: "Не дождался", color: "default" },
};

export default function MyDay() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [today, setToday] = useState<TodayOut | null>(null);
  const [queue, setQueue] = useState<QueueItemOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const [todayRes, queueRes] = await Promise.all([
        api.GET("/api/doctor/me/today"),
        api.GET("/api/doctor/queue"),
      ]);
      if (cancelled) return;
      if (todayRes.data && queueRes.data) {
        setToday(todayRes.data);
        setQueue(queueRes.data);
        setError("");
      } else {
        const failed = todayRes.data === undefined ? todayRes : queueRes;
        setError(formatApiError(failed.error, failed.response.status));
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const call = async (ticket: QueueItemOut) => {
    const {
      data,
      error: body,
      response,
    } = await api.POST("/api/doctor/queue/{ticket_id}/call", {
      params: { path: { ticket_id: ticket.id } },
    });
    if (data) {
      message.success(`Пациент №${ticket.number} вызван — номер на табло`);
      setQueue((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: "called" } : t)),
      );
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const skip = async (ticket: QueueItemOut) => {
    const {
      data,
      error: body,
      response,
    } = await api.POST("/api/doctor/queue/{ticket_id}/skip", {
      params: { path: { ticket_id: ticket.id } },
    });
    if (data) {
      message.info(`Талон №${ticket.number} пропущен`);
      setQueue((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: "skipped" } : t)),
      );
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const columns: ColumnsType<QueueItemOut> = [
    {
      title: "№",
      dataIndex: "number",
      width: 70,
      render: (n: number) => (
        <Typography.Text strong style={{ fontSize: 18 }}>
          {n}
        </Typography.Text>
      ),
    },
    {
      title: "Пациент",
      dataIndex: "patient_name",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Запись на",
      dataIndex: "appointment_starts_at",
      width: 110,
      render: (iso: string | null) =>
        iso ? dayjs(iso).format("HH:mm") : "живая очередь",
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 130,
      render: (status: QueueItemOut["status"]) => (
        <Tag color={TICKET_STATUS[status].color}>
          {TICKET_STATUS[status].label}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 260,
      render: (_, ticket) => (
        <Space>
          {ticket.status === "waiting" && (
            <Button type="primary" onClick={() => void call(ticket)}>
              Вызвать
            </Button>
          )}
          {(ticket.status === "waiting" || ticket.status === "called") && (
            <>
              {ticket.status === "called" && (
                <Button
                  type="primary"
                  onClick={() => navigate(`/visit?ticket=${ticket.id}`)}
                >
                  Приём
                </Button>
              )}
              <Button onClick={() => void skip(ticket)}>Не дождался</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (error) return <Alert type="error" showIcon message={error} />;
  if (!today) return null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Мой день · {dayjs(today.date).format("DD.MM.YYYY")}
      </Typography.Title>

      {today.room_number ? (
        <Alert
          type="success"
          showIcon
          message={`Кабинет ${today.room_number} — смена открыта`}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          message="Кабинет не закреплён — обратитесь в регистратуру (утренний экран)"
        />
      )}

      <Row gutter={16}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Ожидают" value={today.queue.waiting} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Вызваны" value={today.queue.called} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Принято" value={today.queue.done} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Пропущено" value={today.queue.skipped} />
          </Card>
        </Col>
      </Row>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={queue}
        pagination={false}
        locale={{
          emptyText:
            today.workday_id === null
              ? "Смена не открыта — талоны появятся после закрепления кабинета"
              : "Очередь пуста",
        }}
      />
    </Space>
  );
}
