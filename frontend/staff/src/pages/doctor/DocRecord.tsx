/**
 * Приём врача (E6): выбор талона из очереди, медкарта (жалобы, анамнез,
 * лечение), диагнозы по МКБ-10 (основной + сопутствующие), направление
 * к специальности; завершение приёма.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Form, Input, Modal, Select } from "antd";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type QueueItemOut = components["schemas"]["QueueItemOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];

interface DiagnosisRow {
  code: string;
  name: string;
}

export default function DocRecord() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [queue, setQueue] = useState<QueueItemOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>(
    [],
  );
  const [ticketId, setTicketId] = useState<number | null>(
    Number(searchParams.get("ticket")) || null,
  );
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  // модалка направления открыта
  const [referralOpen, setReferralOpen] = useState(false);
  // направление будет выдано вместе с завершением приёма
  const [withReferral, setWithReferral] = useState(false);
  const [referralSpecId, setReferralSpecId] = useState<number | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [
        { data: queueData, error: qError, response: qResponse },
        { data: specs },
      ] = await Promise.all([
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

  const openTickets = queue.filter(
    (t) =>
      t.status === "waiting" ||
      t.status === "called" ||
      t.status === "in_progress",
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
    if (diagnoses.some((d) => !d.code.trim() || !d.name.trim())) {
      message.warning("У каждого диагноза должны быть код и название");
      return;
    }
    if (withReferral && referralSpecId === null) {
      message.warning("Выберите специальность направления");
      return;
    }
    const values = await form.validateFields();
    setSaving(true);
    const {
      data,
      error: errBody,
      response,
    } = await api.POST("/api/doctor/visits", {
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
      navigate("/staff/doc/myday");
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  if (error)
    return (
      <div className="view">
        <p className="text-danger text-sm">{error}</p>
      </div>
    );

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Приём / Медицинская карта</h1>
          <p className="page-subtitle">
            {ticket
              ? `Талон №${ticket.number} · ${ticket.patient_name ?? "пациент не опознан"}`
              : "Выберите талон из очереди"}
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/staff/doc/myday")}
        >
          Назад
        </button>
      </div>

      <div className="record-layout">
        {/* Левая колонка: талон и пациент */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="input-group">
              <label>Талон (ожидающий, вызванный или на приёме)</label>
              <Select
                style={{ width: "100%" }}
                placeholder="Талон"
                value={ticketId}
                onChange={setTicketId}
                options={openTickets.map((t) => ({
                  value: t.id,
                  label: `№${t.number} · ${t.patient_name ?? "пациент"}${
                    t.status === "called"
                      ? " · вызван"
                      : t.status === "in_progress"
                        ? " · на приёме"
                        : ""
                  }`,
                }))}
              />
            </div>
            {ticket && (
              <>
                <div className="info-row">
                  <span className="text-muted">Талон</span>
                  <span className="font-medium">№{ticket.number}</span>
                </div>
                <div className="info-row">
                  <span className="text-muted">Пациент</span>
                  <span className="font-medium">
                    {ticket.patient_name ?? "—"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-muted">Запись на</span>
                  <span className="font-medium">
                    {ticket.appointment_starts_at
                      ? `${dayjsLocal(ticket.appointment_starts_at)} (по записи)`
                      : "живая очередь"}
                  </span>
                </div>
              </>
            )}
          </div>

          {withReferral && (
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <h4
                  className="font-semibold text-dark text-sm"
                  style={{ margin: 0 }}
                >
                  Направление будет выдано
                </h4>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setWithReferral(false)}
                >
                  Отменить
                </button>
              </div>
              <div className="text-sm text-dark">
                К специальности:{" "}
                {specializations.find((s) => s.id === referralSpecId)?.name ??
                  "— не выбрана"}
              </div>
              {referralReason.trim() && (
                <div className="text-xs text-muted mt-1">
                  Причина: {referralReason.trim()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Правая колонка: медкарта */}
        <div
          className="card"
          style={{
            padding: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: "550px",
          }}
        >
          <div className="tabs">
            <div className="tab active">Карта</div>
            <div
              className="tab"
              title="История приёмов появится позже"
              onClick={() =>
                message.info(
                  "История приёмов пока не отображается — раздел в разработке",
                )
              }
            >
              История
            </div>
            <div
              className="tab"
              title="Документы появятся позже"
              onClick={() =>
                message.info(
                  "Документы пока не загружаются — раздел в разработке",
                )
              }
            >
              Документы
            </div>
          </div>

          <div style={{ padding: 16, flexGrow: 1 }}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="complaints"
                label="Жалобы"
                style={{ marginBottom: 16 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Например: боль в груди при нагрузке"
                />
              </Form.Item>
              <Form.Item
                name="anamnesis"
                label="Анамнез"
                style={{ marginBottom: 16 }}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Когда началось, чем лечился ранее"
                />
              </Form.Item>
              <Form.Item
                name="treatment"
                label="Лечение и рекомендации"
                style={{ marginBottom: 16 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Назначения, рекомендации"
                />
              </Form.Item>
            </Form>

            <div className="flex justify-between items-center mb-2 mt-4">
              <h4
                className="font-semibold text-dark text-sm"
                style={{ margin: 0 }}
              >
                Диагнозы по МКБ-10
              </h4>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setDiagnoses((prev) => [...prev, { code: "", name: "" }]);
                  setPrimaryIndex(diagnoses.length);
                }}
              >
                + Добавить диагноз
              </button>
            </div>
            {diagnoses.length === 0 && (
              <p className="text-sm text-muted">
                Добавьте основной диагноз и при необходимости сопутствующие
              </p>
            )}
            {diagnoses.map((d, i) => (
              <div key={i} className="flex gap-2 items-center mb-2 flex-wrap">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="primary-diagnosis"
                    checked={primaryIndex === i}
                    onChange={() => setPrimaryIndex(i)}
                  />
                  основной
                </label>
                <input
                  type="text"
                  className="input-field"
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
                <input
                  type="text"
                  className="input-field"
                  style={{ flex: 1, minWidth: 240 }}
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
                <button
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => {
                    setDiagnoses((prev) => prev.filter((_, j) => j !== i));
                    setPrimaryIndex((p) => (p >= diagnoses.length - 1 ? 0 : p));
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          {/* Нижняя панель действий */}
          <div
            className="flex justify-between items-center p-4"
            style={{
              borderTop: "1px solid var(--border)",
              background: "#FAFAFA",
              borderRadius: "0 0 10px 10px",
            }}
          >
            <button
              className="btn btn-outline"
              disabled={ticketId === null}
              onClick={() => setReferralOpen(true)}
            >
              Направление
            </button>
            <div className="flex gap-2">
              <button
                className="btn btn-outline"
                onClick={() => navigate("/staff/doc/myday")}
              >
                Без завершения
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || ticketId === null}
                onClick={() => void finish()}
              >
                {saving ? "Сохраняем…" : "Завершить приём"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно направления */}
      <Modal
        title="Направление к специальности"
        open={referralOpen}
        onCancel={() => setReferralOpen(false)}
        onOk={() => {
          if (referralSpecId === null) {
            message.warning("Выберите специальность направления");
            return;
          }
          setWithReferral(true);
          setReferralOpen(false);
        }}
        okText="Приложить к приёму"
        cancelText="Отмена"
      >
        <div className="input-group mt-4">
          <label>Специальность *</label>
          <Select
            style={{ width: "100%" }}
            placeholder="Куда направляем"
            value={referralSpecId}
            onChange={setReferralSpecId}
            options={specializations.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />
        </div>
        <div className="input-group">
          <label>Причина (необязательно)</label>
          <input
            type="text"
            className="input-field"
            placeholder="Например: консультация кардиолога"
            value={referralReason}
            onChange={(e) => setReferralReason(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted">
          Направление уйдёт в регистратуру вместе с завершением приёма. До
          завершения его можно отменить кнопкой «Отменить» в карточке слева.
        </p>
      </Modal>
    </div>
  );
}

/** «10:40» — время записи из ISO-строки бэкенда. */
function dayjsLocal(iso: string): string {
  return iso.slice(11, 16);
}
