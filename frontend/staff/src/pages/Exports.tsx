/**
 * Выгрузки (E12): приёмы за день раздельно по гражданам РФ / иностранцам,
 * просмотр и скачивание JSON (ручной вариант вечерней выгрузки).
 */

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type DailyExportOut = components["schemas"]["DailyExportOut"];
type ExportVisit = components["schemas"]["ExportVisit"];

/** Скачивание JSON-фрагмента выгрузки как файла. */
function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Exports() {
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [report, setReport] = useState<DailyExportOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error: body, response } = await api.GET(
      "/api/admin/reports/daily",
      {
        params: {
          query: date ? { date: date.format("YYYY-MM-DD") } : {},
        },
      },
    );
    if (data) {
      setReport(data);
      setError("");
    } else {
      setError(formatApiError(body, response.status));
    }
    setLoading(false);
  };

  const visitColumns = (isForeign: boolean): ColumnsType<ExportVisit> => [
    { title: "Талон", dataIndex: "ticket_number", width: 80 },
    {
      title: "Пациент",
      render: (_, v) =>
        `${v.patient.full_name ?? `№${v.patient.id}`}${
          isForeign && v.patient.insurance_policy
            ? ` · страховка ${v.patient.insurance_policy}`
            : ""
        }`,
    },
    {
      title: "Врач",
      key: "doctor",
      render: (_, v) =>
        `${v.doctor_name ?? "—"} (${v.specialization_name ?? "—"})`,
    },
    {
      title: "Диагнозы МКБ-10",
      dataIndex: "diagnoses",
      render: (diagnoses: ExportVisit["diagnoses"]) =>
        diagnoses.length === 0
          ? "—"
          : diagnoses.map((d, i) => (
              <Tag key={i} color={d.is_primary ? "red" : "default"}>
                {d.code} {d.is_primary ? "(основной)" : ""}
              </Tag>
            )),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Выгрузки
      </Typography.Title>

      <Card size="small">
        <Flex gap="middle" wrap align="center">
          <Typography.Text>Дата:</Typography.Text>
          <DatePicker
            value={date}
            onChange={(d) => setDate(d)}
            allowClear
            placeholder="сегодня"
          />
          <Button type="primary" loading={loading} onClick={() => void load()}>
            Показать
          </Button>
          {report && (
            <>
              <Button
                onClick={() =>
                  downloadJson(`pandora-ru-${report.date}.json`, report.ru)
                }
              >
                Скачать РФ
              </Button>
              <Button
                onClick={() =>
                  downloadJson(
                    `pandora-foreign-${report.date}.json`,
                    report.foreign,
                  )
                }
              >
                Скачать не-РФ
              </Button>
            </>
          )}
        </Flex>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}

      {report && (
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={`Граждане РФ · ${dayjs(report.date).format("DD.MM.YYYY")}`}
              size="small"
            >
              <Statistic title="Приёмов" value={report.ru.total} />
              <Table
                rowKey="medical_record_id"
                size="small"
                style={{ marginTop: 12 }}
                columns={visitColumns(false)}
                dataSource={report.ru.visits}
                pagination={false}
                locale={{ emptyText: "Приёмов не было" }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={`Иностранные граждане · ${dayjs(report.date).format("DD.MM.YYYY")}`}
              size="small"
            >
              <Statistic title="Приёмов" value={report.foreign.total} />
              <Table
                rowKey="medical_record_id"
                size="small"
                style={{ marginTop: 12 }}
                columns={visitColumns(true)}
                dataSource={report.foreign.visits}
                pagination={false}
                locale={{ emptyText: "Приёмов не было" }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </Space>
  );
}
