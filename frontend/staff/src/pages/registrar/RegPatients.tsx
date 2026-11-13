/**
 * Пациенты (E2): поиск по СНИЛС / ФИО / телефону, регистрация нового —
 * гражданин РФ с СНИЛС или иностранец со сторонней страховкой; приём без
 * СНИЛС (личность не установлена); карточка пациента с дозаполнением (PATCH).
 */

import { useCallback, useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, Radio, Spin } from 'antd';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type PatientOut = components['schemas']['PatientOut'];

interface RegistrationForm {
  citizenship: 'RUS' | 'FOREIGN';
  citizenship_code?: string;
  full_name?: string;
  birth_date?: { format: (f: string) => string } | null;
  snils?: string;
  phone?: string;
  insurance_policy?: string;
  insurance_company?: string;
}

/** Подсказка в списке: СНИЛС или страховка. */
function hint(p: PatientOut): string {
  if (p.snils) return `СНИЛС ${p.snils}`;
  if (p.insurance_policy) return `страховка ${p.insurance_policy}`;
  return p.citizenship === 'RUS' ? 'РФ' : p.citizenship;
}

export default function RegPatients() {
  const { message } = App.useApp();
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  // регистрация нового пациента: unknown = приём без СНИЛС (личность не установлена)
  const [unknownMode, setUnknownMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registerForm] = Form.useForm<RegistrationForm>();
  const citizenship = Form.useWatch('citizenship', registerForm);

  // карточка пациента: просмотр и дозаполнение
  const [selected, setSelected] = useState<PatientOut | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardForm] = Form.useForm();

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const { data, error: errBody, response } = await api.GET('/api/registrar/patients', {
      params: { query: { query: q } },
    });
    if (data) {
      setPatients(data);
      setError('');
    } else {
      setError(formatApiError(errBody, response.status));
    }
    setLoading(false);
  }, []);

  // первая загрузка списка — без переключения loading до ответа (требование react-hooks)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await api.GET('/api/registrar/patients', {
        params: { query: { query: '' } },
      });
      if (cancelled) return;
      setPatients(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openRegister = (unknown: boolean) => {
    setUnknownMode(unknown);
    registerForm.setFieldsValue({ citizenship: unknown ? 'FOREIGN' : 'RUS' });
  };

  const register = async () => {
    const values = await registerForm.validateFields();
    const isForeign = values.citizenship === 'FOREIGN';
    setSaving(true);
    const { data, error: errBody, response } = await api.POST('/api/registrar/patients', {
      body: {
        full_name: unknownMode ? null : (values.full_name?.trim() || null),
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        citizenship: isForeign ? (values.citizenship_code ?? 'UZB').toUpperCase() : 'RUS',
        snils: unknownMode ? null : (values.snils?.trim() ? values.snils.trim() : null),
        phone: values.phone?.trim() ? values.phone.trim() : null,
        insurance_policy: values.insurance_policy?.trim() || null,
        insurance_company: values.insurance_company?.trim() || null,
      },
    });
    setSaving(false);
    if (data) {
      message.success(
        unknownMode
          ? 'Неопознанный пациент зарегистрирован — личность можно дозаполнить позже'
          : `Пациент «${data.full_name}» зарегистрирован`,
      );
      registerForm.resetFields();
      void search('');
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  const openCard = (p: PatientOut) => {
    setSelected(p);
    cardForm.setFieldsValue({
      full_name: p.full_name,
      snils: p.snils,
      phone: p.phone,
      insurance_policy: p.insurance_policy,
      insurance_company: p.insurance_company,
    });
  };

  const saveCard = async () => {
    if (!selected) return;
    const values = await cardForm.validateFields();
    setCardSaving(true);
    const { data, error: errBody, response } = await api.PATCH('/api/registrar/patients/{patient_id}', {
      params: { path: { patient_id: selected.id } },
      body: {
        full_name: values.full_name?.trim() || null,
        snils: values.snils?.trim() || null,
        phone: values.phone?.trim() || null,
        insurance_policy: values.insurance_policy?.trim() || null,
        insurance_company: values.insurance_company?.trim() || null,
      },
    });
    setCardSaving(false);
    if (data) {
      message.success('Карточка сохранена');
      setSelected(null);
      void search(query);
    } else {
      message.error(formatApiError(errBody, response.status));
    }
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Пациенты</h1>
          <p className="page-subtitle">Поиск, регистрация и дозаполнение карточек пациентов.</p>
        </div>
      </div>

      {/* Поисковая строка */}
      <div className="search-bar">
        <input
          type="text"
          className="input-field"
          placeholder="Поиск по СНИЛС, ФИО или телефону…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void search(query)}
        />
        <button className="btn btn-primary" onClick={() => void search(query)}>Найти</button>
      </div>

      {error && <p className="text-danger text-sm" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="patient-layout">
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--dark)', marginBottom: 12 }}>
            Найдено: {patients.length}
          </h3>
          {loading ? (
            <Spin style={{ display: 'block', margin: 24 }} />
          ) : (
            <div className="recent-patients flex flex-col gap-2">
              {patients.map((p) => (
                <div key={p.id} className="patient-list-item" onClick={() => openCard(p)}>
                  <div className="patient-info">
                    <div className="avatar">
                      {p.full_name
                        ? p.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
                        : '!'}
                    </div>
                    <div className="patient-text">
                      <div className={`font-medium text-sm ${p.full_name ? 'text-dark' : 'text-danger'}`}>
                        {p.full_name ?? 'Личность не установлена'}
                      </div>
                      <div className="text-xs text-muted">{hint(p)}</div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              ))}
              {patients.length === 0 && <p className="text-sm text-muted">Никого не найдено</p>}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', color: 'var(--dark)' }}>Новый пациент</h2>
            <button className="btn btn-danger-outline" onClick={() => openRegister(true)}>
              + Приём без СНИЛС
            </button>
          </div>
          <Form form={registerForm} layout="vertical" initialValues={{ citizenship: 'RUS' }} requiredMark={false}>
            <Form.Item name="citizenship" label="Гражданство">
              <Radio.Group
                options={[
                  { value: 'RUS', label: 'РФ' },
                  { value: 'FOREIGN', label: 'Иностранец' },
                ]}
              />
            </Form.Item>
            {!unknownMode && (
              <Form.Item
                name="full_name"
                label="ФИО *"
                rules={[{ required: true, message: 'Введите ФИО' }]}
              >
                <Input placeholder="Иванов Иван Иванович" />
              </Form.Item>
            )}
            <Form.Item
              name="snils"
              label="СНИЛС (11 цифр, можно без него)"
              rules={[{ pattern: /^\d{11}$/, message: 'СНИЛС — 11 цифр без разделителей' }]}
            >
              <Input placeholder="11223344595" maxLength={11} />
            </Form.Item>
            {citizenship === 'FOREIGN' && (
              <>
                <Form.Item
                  name="citizenship_code"
                  label="Гражданство (код ISO 3166-1)"
                  initialValue="UZB"
                  rules={[{ pattern: /^[A-Za-z]{3}$/, message: 'Три латинские буквы, например UZB' }]}
                >
                  <Input placeholder="UZB" maxLength={3} />
                </Form.Item>
                <Form.Item
                  name="insurance_policy"
                  label="Номер сторонней страховки *"
                  rules={[{ required: true, message: 'Иностранцу без СНИЛС нужна сторонняя страховка' }]}
                >
                  <Input placeholder="UZ-774421" />
                </Form.Item>
                <Form.Item name="insurance_company" label="Страховая компания">
                  <Input placeholder="Uzbekinvest International" />
                </Form.Item>
              </>
            )}
            <Form.Item name="birth_date" label="Дата рождения">
              <DatePicker style={{ width: '100%' }} placeholder="Необязательно" />
            </Form.Item>
            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7 999 123-45-67" />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn btn-outline" onClick={() => { setUnknownMode(false); registerForm.resetFields(); }}>
                Очистить
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void register()}>
                {saving ? 'Регистрируем…' : 'Зарегистрировать'}
              </button>
            </div>
          </Form>
        </div>
      </div>

      {/* Карточка пациента: просмотр и дозаполнение */}
      <Modal
        title="Карточка пациента"
        open={selected !== null}
        onCancel={() => setSelected(null)}
        onOk={() => void saveCard()}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={cardSaving}
      >
        {selected && (
          <>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              {selected.citizenship === 'RUS' ? 'Гражданство: РФ' : `Гражданство: ${selected.citizenship}`}
              {selected.birth_date ? ` · дата рождения ${selected.birth_date.slice(8, 10)}.${selected.birth_date.slice(5, 7)}.${selected.birth_date.slice(0, 4)}` : ''}
            </p>
            <Form form={cardForm} layout="vertical" requiredMark={false}>
              <Form.Item name="full_name" label="ФИО">
                <Input placeholder="Иванов Иван Иванович" />
              </Form.Item>
              <Form.Item
                name="snils"
                label="СНИЛС (11 цифр)"
                rules={[{ pattern: /^\d{11}$/, message: 'СНИЛС — 11 цифр без разделителей' }]}
              >
                <Input placeholder="11223344595" maxLength={11} />
              </Form.Item>
              <Form.Item name="phone" label="Телефон">
                <Input placeholder="+7 999 123-45-67" />
              </Form.Item>
              <Form.Item name="insurance_policy" label="Страховка: номер">
                <Input placeholder="UZ-774421" />
              </Form.Item>
              <Form.Item name="insurance_company" label="Страховка: компания">
                <Input placeholder="Uzbekinvest International" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
