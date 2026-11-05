/**
 * Запись и талоны (E3): слот-пикер (специальность → свободные слоты → запись,
 * в том числе по направлению), талон живой очереди и талон по записи.
 */

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Flex,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";
import PatientSelect from "../components/PatientSelect";

type SlotOut = components["schemas"]["SlotOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];
type ReferralOut = components["schemas"]["ReferralOut"];
type MorningOut = components["schemas"]["MorningOut"];
type AppointmentOut = components["schemas"]["AppointmentOut"];

const DAYS_TO_SHOW = 7;

export default function Appointments() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState("");

  const [specializations, setSpecializations] = useState<SpecializationOut[]>(
    [],
  );
  const [specializationId, setSpecializationId] = useState<number | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());

  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [referralId, setReferralId] = useState<number | null>(null);

  const [morning, setMorning] = useState<MorningOut | null>(null);
  const [workdayId, setWorkdayId] = useState<number | null>(null);

  // запись только что создана: предложить талон на приём
  const [booked, setBooked] = useState<{
    appointment: AppointmentOut;
    slot: SlotOut;
  } | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  // справочники: специальности, направления, закреплённые врачи
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: specs }, { data: refs }, { data: morningData }] =
        await Promise.all([
          api.GET("/api/public/specializations"),
          api.GET("/api/registrar/referrals", {
            params: { query: { status: "active" } },
          }),
          api.GET("/api/registrar/morning"),
        ]);
      if (cancelled) return;
      setSpecializations(specs ?? []);
      setReferrals(refs ?? []);
      setMorning(morningData ?? null);
      // ?referral=ID — пришли с экрана направлений
      const fromQuery = Number(searchParams.get("referral"));
      if (fromQuery && refs?.some((r) => r.id === fromQuery)) {
        setReferralId(fromQuery);
      }
    })();
    return () => {
      cancelled = true;
    };
    // searchParams не нужен в зависимостях: читаем один раз при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // свободные слоты по выбранной специальности и дате
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (specializationId === null) {
        setSlots([]);
        setSlotsError("");
        setSlotsLoading(false);
        return;
      }
      setSlotsLoading(true);
      const from = (date ?? dayjs()).format("YYYY-MM-DD");
      const to = (date ?? dayjs())
        .add(DAYS_TO_SHOW - 1, "day")
        .format("YYYY-MM-DD");
      const { data, error, response } = await api.GET("/api/registrar/slots", {
        params: {
          query: {
            specialization_id: specializationId,
            date_from: from,
            date_to: to,
          },
        },
      });
      if (cancelled) return;
      if (data) {
        setSlots(data);
        setSlotsError("");
      } else {
        setSlotsError(formatApiError(error, response.status));
      }
      setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [specializationId, date]);

  const book = async (slot: SlotOut) => {
    if (patientId === null) {
      message.warning("Сначала выберите пациента");
      return;
    }
    const {
      data: appointment,
      error,
      response,
    } = await api.POST("/api/registrar/appointments", {
      body: {
        slot_id: slot.id,
        patient_id: patientId,
        referral_id: referralId ?? undefined,
      },
    });
    if (appointment) {
      setBooked({ appointment, slot });
      if (referralId) {
        setReferralId(null);
        searchParams.delete("referral");
        setSearchParams(searchParams, { replace: true });
        const { data: refs } = await api.GET("/api/registrar/referrals", {
          params: { query: { status: "active" } },
        });
        setReferrals(refs ?? []);
      }
      // слот занялся — обновляем таблицу (просто выкидываем его из списка)
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } else {
      message.error(formatApiError(error, response.status));
    }
  };

  /** Талон по только что созданной записи: врач и день берутся из слота. */
  const issueTicketForAppointment = async () => {
    if (!booked || patientId === null) return;
    setTicketLoading(true);
    const {
      data: ticket,
      error,
      response,
    } = await api.POST("/api/registrar/tickets", {
      body: { patient_id: patientId, appointment_id: booked.appointment.id },
    });
    setTicketLoading(false);
    if (ticket) {
      message.success(
        `Талон №${ticket.number} выдан — номер появится на табло`,
      );
      setBooked(null);
    } else {
      message.error(formatApiError(error, response.status));
    }
  };

  /** Талон живой очереди: к конкретному работающему сегодня врачу. */
  const issueLiveTicket = async () => {
    if (patientId === null) {
      message.warning("Сначала выберите пациента");
      return;
    }
    if (workdayId === null) {
      message.warning("Выберите врача (смену)");
      return;
    }
    const {
      data: ticket,
      error,
      response,
    } = await api.POST("/api/registrar/tickets", {
      body: { patient_id: patientId, doctor_workday_id: workdayId },
    });
    if (ticket) {
      message.success(
        `Талон №${ticket.number} выдан — номер появится на табло`,
      );
    } else {
      message.error(formatApiError(error, response.status));
    }
  };

  const slotColumns: ColumnsType<SlotOut> = [
    {
      title: "Дата",
      key: "date",
      width: 110,
      render: (_, s) => dayjs(s.starts_at).format("DD.MM (dd)"),
    },
    {
      title: "Время",
      key: "time",
      width: 120,
      render: (_, s) =>
        `${dayjs(s.starts_at).format("HH:mm")}–${dayjs(s.ends_at).format("HH:mm")}`,
    },
    {
      title: "Врач",
      dataIndex: "doctor_name",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "",
      key: "action",
      width: 130,
      render: (_, s) => (
        <Button type="primary" onClick={() => void book(s)}>
          Записать
        </Button>
      ),
    },
  ];

  const selectedReferral = referrals.find((r) => r.id === referralId);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Запись и талоны
      </Typography.Title>

      <Card size="small">
        <Flex gap="middle" wrap="wrap" align="center">
          <Typography.Text strong>Пациент:</Typography.Text>
          <PatientSelect
            value={patientId}
            onChange={(id, p) => {
              setPatientId(id);
              setPatientName(p?.full_name ?? "");
            }}
          />
        </Flex>
      </Card>

      <Card
        title="Запись на приём"
        size="small"
        extra={
          <Select
            style={{ width: 260 }}
            placeholder="Запись по направлению"
            allowClear
            value={referralId}
            onChange={setReferralId}
            options={referrals.map((r) => ({
              value: r.id,
              label: `Направление №${r.id}`,
            }))}
          />
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {selectedReferral && (
            <Alert
              type="info"
              showIcon
              message={`Запись по направлению №${selectedReferral.id}`}
              description={`При записи направление закроется. Причина: ${selectedReferral.reason ?? "не указана"}`}
            />
          )}
          <Flex gap="middle" wrap="wrap">
            <Select
              style={{ width: 240 }}
              placeholder="Специальность"
              showSearch
              optionFilterProp="label"
              value={specializationId}
              onChange={setSpecializationId}
              options={specializations.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
            <DatePicker
              value={date}
              onChange={(d) => setDate(d)}
              placeholder="Дата от"
              allowClear={false}
            />
            <Typography.Text type="secondary">
              Показываем свободные слоты на {DAYS_TO_SHOW} дней вперёд
            </Typography.Text>
          </Flex>

          {specializationId === null ? (
            <Typography.Text type="secondary">
              Выберите специальность, чтобы увидеть свободные слоты
            </Typography.Text>
          ) : slotsLoading ? (
            <Spin />
          ) : slotsError ? (
            <Alert type="error" showIcon message={slotsError} />
          ) : (
            <Table
              rowKey="id"
              size="small"
              columns={slotColumns}
              dataSource={slots}
              pagination={false}
              locale={{ emptyText: "Свободных слотов нет" }}
            />
          )}
        </Space>
      </Card>

      <Card title="Талон живой очереди" size="small">
        <Flex gap="middle" wrap="wrap" align="center">
          <Select
            style={{ width: 320 }}
            placeholder="Врач (открытая смена)"
            value={workdayId}
            onChange={setWorkdayId}
            options={(morning?.occupied ?? []).map((o) => ({
              value: o.workday_id,
              label: `Каб. ${o.room_number} · ${o.full_name} (${o.specialization_name})`,
            }))}
          />
          <Button type="primary" onClick={() => void issueLiveTicket()}>
            Выдать талон
          </Button>
        </Flex>
      </Card>

      <Modal
        title="Пациент записан"
        open={booked !== null}
        okText="Выдать талон"
        cancelText="Позже"
        confirmLoading={ticketLoading}
        onOk={() => void issueTicketForAppointment()}
        onCancel={() => setBooked(null)}
      >
        {booked && (
          <Typography.Paragraph>
            {patientName || "Пациент"} записан{" "}
            {dayjs(booked.slot.starts_at).format("DD.MM в HH:mm")} к врачу{" "}
            {booked.slot.doctor_name ?? ""}. Выдать талон в живую очередь?
          </Typography.Paragraph>
        )}
      </Modal>
    </Space>
  );
}
