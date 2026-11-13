/**
 * Выгрузки (админ, E12): приёмы за день раздельно по гражданам РФ и
 * иностранцам — счётчики и скачивание JSON (ручной вариант вечерней выгрузки).
 */

import { useState } from 'react';
import { App, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type DailyExportOut = components['schemas']['DailyExportOut'];

/** Скачивание JSON-фрагмента выгрузки как файла. */
function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminExports() {
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [report, setReport] = useState<DailyExportOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error: errBody, response } = await api.GET('/api/admin/reports/daily', {
      params: {
        query: date ? { date: date.format('YYYY-MM-DD') } : {},
      },
    });
    setLoading(false);
    if (data) {
      setReport(data);
      setError('');
      return data;
    }
    setError(formatApiError(errBody, response.status));
    return null;
  };

  /** Загрузить (если нужно) и скачать выбранный фрагмент выгрузки. */
  const download = async (group: 'ru' | 'foreign') => {
    const current =
      report && date && report.date === date.format('YYYY-MM-DD')
        ? report
        : await load();
    if (!current) {
      message.warning('Сначала загрузите выгрузку за дату');
      return;
    }
    const fragment = group === 'ru' ? current.ru : current.foreign;
    if (fragment.total === 0) {
      message.info('За этот день приёмов в выбранной группе нет — файл не создаётся');
      return;
    }
    downloadJson(
      group === 'ru' ? `pandora-ru-${current.date}.json` : `pandora-foreign-${current.date}.json`,
      fragment,
    );
    message.success('Файл выгрузки скачан');
  };

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Выгрузки</h1>
          <p className="page-subtitle">Вечерняя выгрузка приёмов раздельно по гражданам РФ и иностранцам.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="input-group">
          <label>Дата выгрузки</label>
          <DatePicker
            value={date}
            onChange={setDate}
            allowClear
            placeholder="сегодня"
            format="DD.MM.YYYY"
            style={{ width: '100%', padding: '6px 11px' }}
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        {report && !error && (
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            За {dayjs(report.date).format('DD.MM.YYYY')}: приёмов РФ — <b>{report.ru.total}</b>,
            иностранных — <b>{report.foreign.total}</b>
          </p>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button className="btn btn-primary w-100" disabled={loading} onClick={() => void download('ru')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            {loading ? 'Загружаем…' : 'Скачать выгрузку РФ'}
          </button>
          <button className="btn btn-outline w-100" disabled={loading} onClick={() => void download('foreign')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            {loading ? 'Загружаем…' : 'Скачать выгрузку не-РФ'}
          </button>
        </div>

        <p className="text-xs text-muted mt-4">
          JSON содержит приёмы дня: пациент, врач, диагнозы МКБ-10. Группы раздельны —
          у граждан РФ и иностранных граждан разное финансирование.
        </p>
      </div>
    </div>
  );
}
