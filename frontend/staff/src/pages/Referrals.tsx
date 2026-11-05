/**
 * Направления и перезвоны (E4): заявки с внешнего сайта (взять в работу /
 * закрыть) и направления врачей — переход к записи по направлению на E3.
 */

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type CallbackOut = components["schemas"]["CallbackOut"];
type CallbackStatus = components["schemas"]["CallbackStatus"];
type ReferralOut = components["schemas"]["ReferralOut"];
type ReferralStatus = components["schemas"]["ReferralStatus"];
type PatientOut = components["schemas"]["PatientOut"];
type SpecializationOut = components["schemas"]["SpecializationOut"];

const CALLBACK_STATUS: Record<CallbackStatus, { label: string; color: string }> = {
  new: { label: "Новая", color: "blue" },
  in_progress: { label: "В работе", color: "gold" },
  done: { label: "Обработана", color: "green" },
};

const REFERRAL_STATUS: Record<ReferralStatus, { label: string; color: string }> = {
  active: { label: "Действует", color: "blue" },
  used: { label: "Использовано", color: "green" },
  cancelled: { label: "Отменено", color: "default" },
};

export default function Referrals() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [callbacks, setCallbacks] = useState<CallbackOut[]>([]);
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>("active");
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: cbData, error: cbError, response: cbResponse }, { data: patientsData }, { data: specs }] =
        await Promise.all([
          api.GET("/api/registrar/callbacks"),
          api.GET("/api/registrar/patients", {
            params: { query: { query: "" } },
          }),
          api.GET("/api/public/specializations"),
        ]);
      if (cancelled) return;
      if (cbData) setCallbacks(cbData);
      else setError(formatApiError(cbError, cbResponse.status));
      setPatients(patientsData ?? []);
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // направления перезагружаются при смене фильтра статуса
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: body, response } = await api.GET(
        "/api/registrar/referrals",
        { params: { query: { status: referralStatus } } },
      );
      if (cancelled) return;
      if (data) {
        setReferrals(data);
        setError("");
      } else {
        setError(formatApiError(body, response.status));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referralStatus]);

  const patchCallback = async (id: number, status: CallbackStatus) => {
    const { data, error: body, response } = await api.PATCH(
      "/api/registrar/callbacks/{callback_id}",
      { params: { path: { callback_id: id } }, body: { status } },
    );
    if (data) {
      setCallbacks((prev) => prev.map((c) => (c.id === id ? data : c)));
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const patientName = (id: number) =>
    patients.find((p) => p.id === id)?.full_name ?? `Пациент №${id}`;

  const specName = (id: number) =>
    specializations.find((s) => s.id === id)?.name ?? `Специальность №${id}`;

  const callbackColumns: ColumnsType<CallbackOut> = [
    {
      title: "Создана",
      dataIndex: "created_at",
      width: 140,
      render: (iso: string) => dayjs(iso).format("DD.MM HH:mm"),
    },
    { title: "Телефон", dataIndex: "phone", width: 160 },
    { title: "Имя", dataIndex: "full_name", render: (v: string | null) => v ?? "—" },
    { title: "Комментарий", dataIndex: "comment", render: (v: string | null) => v ?? "—" },
    {
      title: "Статус",
      dataIndex: "status",
      width: 130,
      render: (s: CallbackStatus) => (
        <Tag color={CALLBACK_STATUS[s].color}>{CALLBACK_STATUS[s].label}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 220,
      render: (_, cb) => (
        <Space>
          {cb.status === "new" && (
            <Button onClick={() => void patchCallback(cb.id, "in_progress")}>
              В работу
            </Button>
          )}
          {cb.status === "in_progress" && (
            <Button
              type="primary"
              onClick={() => void patchCallback(cb.id, "done")}
            >
              Обработана
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const referralColumns: ColumnsType<ReferralOut> = [
    { title: "№", dataIndex: "id", width: 60 },
    { title: "Пациент", key: "patient", render: (_, r) => patientName(r.patient_id) },
    {
      title: "К специальности",
      key: "spec",
      render: (_, r) => specName(r.to_specialization_id),
    },
    { title: "Причина", dataIndex: "reason", render: (v: string | null) => v ?? "—" },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 140,
      render: (iso: string) => dayjs(iso).format("DD.MM HH:mm"),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 150,
      render: (s: ReferralStatus) => (
        <Tag color={REFERRAL_STATUS[s].color}>{REFERRAL_STATUS[s].label}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 200,
      render: (_, r) =>
        r.status === "active" ? (
          <Button
            type="primary"
            onClick={() => navigate(`/appointments?referral=${r.id}`)}
          >
            Записать
          </Button>
        ) : null,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Направления и перезвоны
      </Typography.Title>

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      <Tabs
        items={[
          {
            key: "callbacks",
            label: `Перезвоны (${callbacks.filter((c) => c.status !== "done").length})`,
            children: (
              <Table
                rowKey="id"
                size="small"
                columns={callbackColumns}
                dataSource={callbacks}
                pagination={false}
                locale={{ emptyText: "Заявок на перезвон нет" }}
              />
            ),
          },
          {
            key: "referrals",
            label: "Направления",
            children: (
              <>
                <Select
                  style={{ width: 220, marginBottom: 12 }}
                  value={referralStatus}
                  onChange={setReferralStatus}
                  options={(["active", "used", "cancelled"] as ReferralStatus[]).map(
                    (s) => ({ value: s, label: REFERRAL_STATUS[s].label }),
                  )}
                />
                <Table
                  rowKey="id"
                  size="small"
                  columns={referralColumns}
                  dataSource={referrals}
                  pagination={false}
                  locale={{ emptyText: "Направлений нет" }}
                />
              </>
            ),
          },
        ]}
      />
    </Space>
  );
}
