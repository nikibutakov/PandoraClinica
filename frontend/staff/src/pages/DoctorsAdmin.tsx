/**
 * Врачи и график (E10): найм одной операцией (учётка + договор), недельный
 * шаблон графика (полная замена через PUT), деактивация врача.
 */

import { useEffect, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type DoctorOut = components["schemas"]["DoctorOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];
type ScheduleTemplateOut = components["schemas"]["ScheduleTemplateOut"];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface HireForm {
  full_name: string;
  login: string;
  password: string;
  specialization_id: number;
  contract_number: string;
  signed_at?: Dayjs;
  valid_from: Dayjs;
  valid_to?: Dayjs;
}

/** Одна строка редактора графика: день и границы интервала («HH:mm»). */
interface IntervalRow {
  weekday: number;
  start: string;
  end: string;
}

export default function DoctorsAdmin() {
  const { message } = App.useApp();
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [error, setError] = useState("");

  const [hireOpen, setHireOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hireForm] = Form.useForm<HireForm>();

  // редактор графика
  const [scheduleDoctor, setScheduleDoctor] = useState<DoctorOut | null>(null);
  const [intervals, setIntervals] = useState<IntervalRow[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const loadDoctors = async () => {
    const { data, error: body, response } = await api.GET("/api/admin/doctors");
    if (data) {
      setDoctors(data);
      setError("");
    } else {
      setError(formatApiError(body, response.status));
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: docs, error: body, response }, { data: specs }] =
        await Promise.all([
          api.GET("/api/admin/doctors"),
          api.GET("/api/admin/specializations"),
        ]);
      if (cancelled) return;
      if (docs) setDoctors(docs);
      else setError(formatApiError(body, response.status));
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hire = async () => {
    const values = await hireForm.validateFields();
    setSaving(true);
    const { data, error: body, response } = await api.POST("/api/admin/doctors", {
      body: {
        full_name: values.full_name,
        login: values.login,
        password: values.password,
        specialization_id: values.specialization_id,
        contract_number: values.contract_number,
        signed_at: values.signed_at?.format("YYYY-MM-DD") ?? null,
        valid_from: values.valid_from.format("YYYY-MM-DD"),
        valid_to: values.valid_to?.format("YYYY-MM-DD") ?? null,
      },
    });
    setSaving(false);
    if (data) {
      message.success(`Врач «${data.full_name}» нанят: учётка и договор созданы`);
      setHireOpen(false);
      hireForm.resetFields();
      void loadDoctors();
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const openSchedule = async (doctor: DoctorOut) => {
    setScheduleDoctor(doctor);
    const { data } = await api.GET(
      "/api/admin/doctors/{doctor_id}/schedule",
      { params: { path: { doctor_id: doctor.id } } },
    );
    setIntervals(
      (data ?? []).map((t: ScheduleTemplateOut) => ({
        weekday: t.weekday,
        start: t.start_time.slice(0, 5),
        end: t.end_time.slice(0, 5),
      })),
    );
  };

  const saveSchedule = async () => {
    if (scheduleDoctor === null) return;
    for (const row of intervals) {
      if (row.start >= row.end) {
        message.warning(`Интервал ${WEEKDAYS[row.weekday]}: начало позже конца`);
        return;
      }
    }
    setScheduleSaving(true);
    const { data, error: body, response } = await api.PUT(
      "/api/admin/doctors/{doctor_id}/schedule",
      {
        params: { path: { doctor_id: scheduleDoctor.id } },
        body: {
          items: intervals.map((r) => ({
            weekday: r.weekday,
            start_time: r.start,
            end_time: r.end,
          })),
        },
      },
    );
    setScheduleSaving(false);
    if (data) {
      message.success("График сохранён (полная замена шаблонов)");
      setScheduleDoctor(null);
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const toggleActive = async (doctor: DoctorOut, isActive: boolean) => {
    const { error: body, response } = await api.PATCH(
      "/api/admin/doctors/{doctor_id}",
      {
        params: { path: { doctor_id: doctor.id } },
        body: { is_active: isActive },
      },
    );
    if (response.ok) {
      message.success(
        isActive ? "Врач снова работает" : "Врач деактивирован — в графики не попадает",
      );
      void loadDoctors();
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const columns: ColumnsType<DoctorOut> = [
    { title: "Врач", dataIndex: "full_name" },
    { title: "Логин", dataIndex: "login", width: 120 },
    { title: "Специальность", dataIndex: "specialization_name", width: 140 },
    {
      title: "Договор",
      key: "contract",
      render: (_, d) =>
        d.contract
          ? `№${d.contract.number} · ${dayjs(d.contract.valid_from).format("DD.MM.YYYY")}${
              d.contract.valid_to
                ? `–${dayjs(d.contract.valid_to).format("DD.MM.YYYY")}`
                : ""
            }`
          : "—",
    },
    {
      title: "Работает",
      dataIndex: "is_active",
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">да</Tag> : <Tag>нет</Tag>),
    },
    {
      title: "",
      key: "actions",
      width: 250,
      render: (_, d) => (
        <Space>
          <Button onClick={() => void openSchedule(d)}>График</Button>
          {d.is_active ? (
            <Popconfirm
              title="Деактивировать врача?"
              description="Он пропадёт из утренних экранов и записи"
              onConfirm={() => void toggleActive(d, false)}
            >
              <Button danger>Отключить</Button>
            </Popconfirm>
          ) : (
            <Button onClick={() => void toggleActive(d, true)}>Вернуть</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Flex justify="space-between" align="center" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Врачи и график
        </Typography.Title>
        <Button type="primary" onClick={() => setHireOpen(true)}>
          Нанять врача
        </Button>
      </Flex>

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={doctors}
        pagination={false}
      />

      <Modal
        title="Найм врача: учётка + договор"
        open={hireOpen}
        okText="Нанять"
        cancelText="Отмена"
        confirmLoading={saving}
        onOk={() => void hire()}
        onCancel={() => setHireOpen(false)}
      >
        <Form form={hireForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: "Введите ФИО" }]}
          >
            <Input placeholder="Орлова Вера Павловна" />
          </Form.Item>
          <Space wrap>
            <Form.Item
              name="login"
              label="Логин"
              rules={[{ required: true, message: "Введите логин" }]}
            >
              <Input placeholder="orlova" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, min: 4, message: "Минимум 4 символа" }]}
            >
              <Input.Password style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item
            name="specialization_id"
            label="Специальность"
            rules={[{ required: true, message: "Выберите специальность" }]}
          >
            <Select
              options={specializations.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item
            name="contract_number"
            label="Номер договора"
            rules={[{ required: true, message: "Введите номер договора" }]}
          >
            <Input placeholder="Д-005" style={{ width: 200 }} />
          </Form.Item>
          <Space wrap>
            <Form.Item name="signed_at" label="Подписан">
              <DatePicker placeholder="сегодня" />
            </Form.Item>
            <Form.Item
              name="valid_from"
              label="Действует с"
              rules={[{ required: true, message: "Укажите дату начала" }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item name="valid_to" label="Действует до">
              <DatePicker placeholder="бессрочный" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={`Недельный график: ${scheduleDoctor?.full_name ?? ""}`}
        open={scheduleDoctor !== null}
        okText="Сохранить (полная замена)"
        cancelText="Отмена"
        confirmLoading={scheduleSaving}
        onOk={() => void saveSchedule()}
        onCancel={() => setScheduleDoctor(null)}
        width={560}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {intervals.map((row, i) => (
            <Space key={i} wrap>
              <Select
                style={{ width: 90 }}
                value={row.weekday}
                options={WEEKDAYS.map((label, weekday) => ({ value: weekday, label }))}
                onChange={(weekday) =>
                  setIntervals((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, weekday } : r)),
                  )
                }
              />
              <TimePicker
                format="HH:mm"
                minuteStep={30}
                value={row.start ? dayjs(row.start, "HH:mm") : null}
                onChange={(d) =>
                  setIntervals((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, start: d?.format("HH:mm") ?? "" } : r,
                    ),
                  )
                }
              />
              <TimePicker
                format="HH:mm"
                minuteStep={30}
                value={row.end ? dayjs(row.end, "HH:mm") : null}
                onChange={(d) =>
                  setIntervals((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, end: d?.format("HH:mm") ?? "" } : r,
                    ),
                  )
                }
              />
              <Button
                danger
                type="text"
                onClick={() =>
                  setIntervals((prev) => prev.filter((_, j) => j !== i))
                }
              >
                Удалить
              </Button>
            </Space>
          ))}
          <Button
            onClick={() =>
              setIntervals((prev) => [
                ...prev,
                { weekday: 0, start: "09:00", end: "14:00" },
              ])
            }
          >
            Добавить интервал
          </Button>
          <Typography.Text type="secondary">
            Сохранение полностью заменяет график: по шаблонам затем генерируются
            слоты (экран «Слоты»).
          </Typography.Text>
        </Space>
      </Modal>
    </Space>
  );
}
