/**
 * Пациенты (E2): поиск по СНИЛС / ФИО / телефону, регистрация нового —
 * гражданин РФ с СНИЛС или иностранец со сторонней страховкой (СНИЛС опционален).
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
  Radio,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { api, formatApiError } from "@pandora/shared";
import type { components } from "@pandora/shared";

type PatientOut = components["schemas"]["PatientOut"];

interface RegistrationForm {
  citizenship: "RUS" | "FOREIGN";
  citizenship_code?: string;
  full_name: string;
  birth_date: unknown; // DatePicker отдаёт dayjs-объект
  snils?: string;
  phone?: string;
  insurance_policy?: string;
  insurance_company?: string;
}

export default function Patients() {
  const { message } = App.useApp();
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<RegistrationForm>();

  const search = async (q: string) => {
    setLoading(true);
    const { data, error: body, response } = await api.GET(
      "/api/registrar/patients",
      { params: { query: { query: q } } },
    );
    if (data) {
      setPatients(data);
      setError("");
    } else {
      setError(formatApiError(body, response.status));
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: body, response } = await api.GET(
        "/api/registrar/patients",
        { params: { query: { query: "" } } },
      );
      if (cancelled) return;
      if (data) {
        setPatients(data);
      } else {
        setError(formatApiError(body, response.status));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const citizenship = Form.useWatch("citizenship", form);

  const register = async () => {
    const values = await form.validateFields();
    const isForeign = values.citizenship === "FOREIGN";
    setSaving(true);
    const { data, error: body, response } = await api.POST(
      "/api/registrar/patients",
      {
        body: {
          full_name: values.full_name,
          birth_date:
            values.birth_date
              ? (values.birth_date as { format: (f: string) => string }).format(
                  "YYYY-MM-DD",
                )
              : null,
          citizenship: isForeign
            ? (values.citizenship_code ?? "UZB").toUpperCase()
            : "RUS",
          snils: values.snils?.trim() ? values.snils.trim() : null,
          phone: values.phone?.trim() ? values.phone.trim() : null,
          insurance_policy: values.insurance_policy?.trim() || null,
          insurance_company: values.insurance_company?.trim() || null,
        },
      },
    );
    setSaving(false);
    if (data) {
      message.success(`Пациент «${data.full_name}» зарегистрирован`);
      setOpen(false);
      form.resetFields();
      void search("");
    } else {
      message.error(formatApiError(body, response.status));
    }
  };

  const columns: ColumnsType<PatientOut> = [
    { title: "ФИО", dataIndex: "full_name", render: (v: string | null) => v ?? "— (личность не установлена)" },
    {
      title: "Гражданство",
      dataIndex: "citizenship",
      width: 130,
      render: (c: string) =>
        c === "RUS" ? <Tag color="green">РФ</Tag> : <Tag color="purple">{c}</Tag>,
    },
    { title: "СНИЛС", dataIndex: "snils", width: 140, render: (v: string | null) => v ?? "—" },
    {
      title: "Страховка",
      key: "insurance",
      render: (_, p) =>
        p.insurance_policy ? `${p.insurance_policy}${p.insurance_company ? ` · ${p.insurance_company}` : ""}` : "—",
    },
    { title: "Телефон", dataIndex: "phone", width: 150, render: (v: string | null) => v ?? "—" },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Flex justify="space-between" align="center" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Пациенты
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Зарегистрировать пациента
        </Button>
      </Flex>

      <Input.Search
        placeholder="Поиск по ФИО / СНИЛС / телефону"
        allowClear
        enterButton
        onSearch={(q) => {
          setQuery(q);
          void search(q);
        }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 480 }}
      />

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={patients}
        pagination={false}
        locale={{ emptyText: "Никого не найдено" }}
      />

      <Modal
        title="Регистрация пациента"
        open={open}
        okText="Зарегистрировать"
        cancelText="Отмена"
        confirmLoading={saving}
        onOk={() => void register()}
        onCancel={() => setOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ citizenship: "RUS" }}
          requiredMark={false}
        >
          <Form.Item name="citizenship" label="Гражданство">
            <Radio.Group
              options={[
                { value: "RUS", label: "РФ" },
                { value: "FOREIGN", label: "Иностранец" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: "Введите ФИО" }]}
          >
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item name="birth_date" label="Дата рождения">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="snils"
            label="СНИЛС (11 цифр, можно без него)"
            rules={[
              {
                pattern: /^\d{11}$/,
                message: "СНИЛС — 11 цифр без разделителей",
              },
            ]}
          >
            <Input placeholder="11223344595" maxLength={11} />
          </Form.Item>
          {citizenship === "FOREIGN" ? (
            <>
              <Form.Item
                name="citizenship_code"
                label="Гражданство (код ISO 3166-1)"
                initialValue="UZB"
                rules={[
                  { pattern: /^[A-Za-z]{3}$/, message: "Три латинские буквы, например UZB" },
                ]}
              >
                <Input placeholder="UZB" maxLength={3} />
              </Form.Item>
              <Form.Item
                name="insurance_policy"
                label="Номер сторонней страховки"
                rules={[
                  {
                    required: true,
                    message:
                      "Иностранцу без СНИЛС нужна сторонняя страховка (требование бэкенда)",
                  },
                ]}
              >
                <Input placeholder="UZ-774421" />
              </Form.Item>
              <Form.Item name="insurance_company" label="Страховая компания">
                <Input placeholder="Uzbekinvest International" />
              </Form.Item>
            </>
          ) : null}
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="+7 999 123-45-67" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
