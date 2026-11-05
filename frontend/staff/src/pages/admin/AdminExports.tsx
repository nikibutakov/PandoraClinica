import { DatePicker } from 'antd';
import dayjs from 'dayjs';

export default function AdminExports() {
  return (
    <div className="view">
      <div className="page-header">
        <div><h1 className="page-title">Выгрузки</h1><p className="page-subtitle">Скачивание вечерних отчетов.</p></div>
      </div>
      <div className="card" style={{ maxWidth: 500 }}>
        <div className="input-group">
          <label>Выберите дату отчета</label>
          <DatePicker defaultValue={dayjs('2026-11-05')} format="DD.MM.YYYY" style={{ width: '100%', padding: '6px 11px' }} />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <button className="btn btn-primary w-100" onClick={() => alert('Скачивание выгрузки РФ...')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Скачать выгрузку РФ
          </button>
          <button className="btn btn-outline w-100" onClick={() => alert('Скачивание выгрузки не-РФ...')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Скачать выгрузку не-РФ
          </button>
        </div>
      </div>
    </div>
  );
}