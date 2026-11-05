/**
 * Слоты (E11-lite): генерация из недельных шаблонов на период и контроль
 * занятости слотов за выбранную дату.
 */

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Flex,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type SlotOut = components["schemas"]["SlotOut"];
type DoctorOut = components["schemas"]["DoctorOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];

const SLOT_STATUS: Record<string, { label: string; color: string }> = {
  free: { label: "свободен", color: "green" },
  booked: { label: "занят записью", color: "gold" },
  blocked: { label: "снят с записи", color: "default" },
};

export default function SlotsAdmin() {
  const { message } = App.useApp();
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(dayjs());
  const [dateTo, setDateTo] = useState<Dayjs | null>(dayjs().add(13, "day"));
  const [generating, setGenerating] = useState(false);

  const [controlDate, setControlDate] = useState<Dayjs | null>(dayjs());
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [specializationId, setSpecializationId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: docs }, { data: specs }] = await Promise.all([
        api.GET("/api/admin/doctors"),
        api.GET("/api/admin/specializations"),
      ]);
      if (cancelled) return;
      setDoctors(docs ?? []);
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // контроль слотов за выбранную дату (с фильтрами)
  useEffect(() => {
    if (controlDate === null) return;
    let cancelled = false;
    void (async () => {
      const { data, error: body, response } = await api.GET("/api/admin/slots", {
        params: {
          query: {
            date: controlDate.format("YYYY-MM-DD"),
            doctor_id: doctorId ?? undefined,
            specialization_id: specializationId ?? undefined,
          },
        },
      });
      if (cancelled) return;
      if (data) {
        setSlots(data);
        setError("");
      } else {
        setError(formatApiError(body, response.status));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [controlDate, doctorId, specializationId]);

  const generate = async () => {
    if (dateFrom === null || dateTo === null) {
      message.warning("Укажите период генерации");
      return;
    }
    setGenerating(true);
    const { data, error: body, response } = await api.POST(
      "/api/admin/slots/generate",
      {
        params: {
          query: {
            date_from: dateFrom.format("YYYY-MM-DD"),
            date_to: dateTo.format("YYYY-MM-DD"),
          },
        },
      },
    );
    setGenerating(false);
    if (response.ok) {
      message.success(
        `Готово: создано ${(data as { created: number } | undefined)?.created ?? 0} слотов (существующие пропущены)`,
      );
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const columns: ColumnsType<SlotOut> = [
    {
      title: "Время",
      key: "time",
      width: 120,
      render: (_, s) =>
        `${dayjs(s.starts_at).format("HH:mm")}–${dayjs(s.ends_at).format("HH:mm")}`,
    },
    { title: "Врач", dataIndex: "doctor_name", render: (v: string | null) => v ?? "—" },
    {
      title: "Специальность",
      key: "spec",
      render: (_, s) =>
        specializations.find((sp) => sp.id === s.specialization_id)?.name ?? "—",
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 150,
      render: (status: string) => (
        <Tag color={SLOT_STATUS[status]?.color}>
          {SLOT_STATUS[status]?.label ?? status}
        </Tag>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Слоты
      </Typography.Title>

      <Card title="Генерация из шаблонов графика" size="small">
        <Flex gap="middle" wrap align="center">
          <Typography.Text>Период:</Typography.Text>
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="С"
            allowClear={false}
          />
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="По"
            allowClear={false}
          />
          <Button type="primary" loading={generating} onClick={() => void generate()}>
            Сгенерировать
          </Button>
          <Typography.Text type="secondary">
            Идемпотентно: уже существующие слоты пропускаются
          </Typography.Text>
        </Flex>
      </Card>

      <Card title="Контроль слотов за дату" size="small">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Flex gap="middle" wrap>
            <DatePicker
              value={controlDate}
              onChange={(d) => setControlDate(d)}
              allowClear={false}
            />
            <Select
              style={{ width: 240 }}
              placeholder="Все врачи"
              allowClear
              showSearch
              optionFilterProp="label"
              value={doctorId}
              onChange={setDoctorId}
              options={doctors.map((d) => ({
                value: d.id,
                label: d.full_name ?? `Врач №${d.id}`,
              }))}
            />
            <Select
              style={{ width: 200 }}
              placeholder="Все специальности"
              allowClear
              value={specializationId}
              onChange={setSpecializationId}
              options={specializations.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Flex>
          {error && <Typography.Text type="danger">{error}</Typography.Text>}
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={slots}
            pagination={false}
            locale={{ emptyText: "Слотов за эту дату нет" }}
          />
        </Space>
      </Card>
    </Space>
  );
}
