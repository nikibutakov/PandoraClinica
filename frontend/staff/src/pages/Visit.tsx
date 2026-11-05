/**
 * Приём врача (E6): жалобы, анамнез, назначения; диагнозы по МКБ-10
 * (основной + сопутствующие), направление к специальности; завершение приёма.
 * Талон выбирается из очереди (приход с /my-day или выбор вручную).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type QueueItemOut = components["schemas"]["QueueItemOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];

interface DiagnosisRow {
  code: string;
  name: string;
}

export default function Visit() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [queue, setQueue] = useState<QueueItemOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [ticketId, setTicketId] = useState<number | null>(
    Number(searchParams.get("ticket")) || null,
  );
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [withReferral, setWithReferral] = useState(false);
  const [referralSpecId, setReferralSpecId] = useState<number | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: queueData, error: qError, response: qResponse }, { data: specs }] =
        await Promise.all([
          api.GET("/api/doctor/queue"),
          api.GET("/api/public/specializations"),
        ]);
      if (cancelled) return;
      if (queueData) {
        setQueue(queueData);
        setError("");
      } else {
        setError(formatApiError(qError, qResponse.status));
      }
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ticket = useMemo(
    () => queue.find((t) => t.id === ticketId) ?? null,
    [queue, ticketId],
  );

  const finish = async () => {
    if (ticketId === null) {
      message.warning("Выберите талон");
      return;
    }
    if (diagnoses.length === 0) {
      message.warning("Добавьте хотя бы один диагноз по МКБ-10");
      return;
    }
    if (withReferral && referralSpecId === null) {
      message.warning("Выберите специальность направления");
      return;
    }
    const values = await form.validateFields();
    setSaving(true);
    const { data, error: body, response } = await api.POST("/api/doctor/visits", {
      body: {
        ticket_id: ticketId,
        complaints: values.complaints ?? null,
        anamnesis: values.anamnesis ?? null,
        treatment: values.treatment ?? null,
        diagnoses: diagnoses.map((d, i) => ({
          code: d.code.trim(),
          name: d.name.trim(),
          is_primary: i === primaryIndex,
        })),
        referral:
          withReferral && referralSpecId !== null
            ? {
                to_specialization_id: referralSpecId,
                reason: referralReason.trim() || null,
              }
            : null,
      },
    });
    setSaving(false);
    if (data) {
      message.success("Приём завершён, запись в медкарте создана");
      if (withReferral) {
        message.info("Направление передано в регистратуру");
      }
      navigate("/my-day");
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const openTickets = queue.filter(
    (t) => t.status === "waiting" || t.status === "called",
  );

  if (error) return <Alert type="error" showIcon message={error} />;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Приём
      </Typography.Title>

      <Card size="small">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Select
            style={{ width: 420 }}
            placeholder="Талон (вызванный или ожидающий пациент)"
            value={ticketId}
            onChange={setTicketId}
            options={openTickets.map((t) => ({
              value: t.id,
              label: `№${t.number} · ${t.patient_name ?? "пациент"}${
                t.status === "called" ? " · вызван" : ""
              }`,
            }))}
          />
          {ticket && (
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item label="Талон">№{ticket.number}</Descriptions.Item>
              <Descriptions.Item label="Пациент">
                {ticket.patient_name ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Запись на">
                {ticket.appointment_starts_at
                  ? new Date(ticket.appointment_starts_at).toLocaleString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "живая очередь"}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Card>

      <Card size="small" title="Медкарта">
        <Form form={form} layout="vertical">
          <Form.Item name="complaints" label="Жалобы">
            <Input.TextArea rows={2} placeholder="Например: боль в груди при нагрузке" />
          </Form.Item>
          <Form.Item name="anamnesis" label="Анамнез">
            <Input.TextArea rows={2} placeholder="Когда началось, чем лечился ранее" />
          </Form.Item>
          <Form.Item name="treatment" label="Лечение и рекомендации">
            <Input.TextArea rows={2} placeholder="Назначения, рекомендации" />
          </Form.Item>
        </Form>
      </Card>

      <Card
        size="small"
        title="Диагнозы по МКБ-10"
        extra={
          <Button
            onClick={() => setDiagnoses((prev) => [...prev, { code: "", name: "" }])}
          >
            Добавить диагноз
          </Button>
        }
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {diagnoses.length === 0 && (
            <Typography.Text type="secondary">
              Добавьте основной диагноз и при необходимости сопутствующие
            </Typography.Text>
          )}
          {diagnoses.map((d, i) => (
            <Space key={i} wrap>
              <Radio
                checked={primaryIndex === i}
                onChange={() => setPrimaryIndex(i)}
              >
                основной
              </Radio>
              <Input
                style={{ width: 110 }}
                placeholder="Код"
                maxLength={10}
                value={d.code}
                onChange={(e) =>
                  setDiagnoses((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, code: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                style={{ width: 420 }}
                placeholder="Название диагноза"
                value={d.name}
                onChange={(e) =>
                  setDiagnoses((prev) =>
                    prev.map((row, j) =>
                      j === i ? { ...row, name: e.target.value } : row,
                    ),
                  )
                }
              />
              <Button
                danger
                type="text"
                onClick={() => {
                  setDiagnoses((prev) => prev.filter((_, j) => j !== i));
                  setPrimaryIndex((p) => (p >= diagnoses.length - 1 ? 0 : p));
                }}
              >
                Удалить
              </Button>
            </Space>
          ))}
        </Space>
      </Card>

      <Card size="small" title="Направление">
        <Space direction="vertical" size={8}>
          <Checkbox
            checked={withReferral}
            onChange={(e) => setWithReferral(e.target.checked)}
          >
            Выдать направление к специальности
          </Checkbox>
          {withReferral && (
            <Space wrap>
              <Select
                style={{ width: 280 }}
                placeholder="Специальность"
                value={referralSpecId}
                onChange={setReferralSpecId}
                options={specializations.map((s) => ({ value: s.id, label: s.name }))}
              />
              <Input
                style={{ width: 420 }}
                placeholder="Причина (необязательно)"
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
              />
            </Space>
          )}
        </Space>
      </Card>

      <Space>
        <Button
          type="primary"
          size="large"
          loading={saving}
          disabled={ticketId === null}
          onClick={() => void finish()}
        >
          Завершить приём
        </Button>
        <Button size="large" onClick={() => navigate("/my-day")}>
          Назад к очереди
        </Button>
      </Space>
    </Space>
  );
}
