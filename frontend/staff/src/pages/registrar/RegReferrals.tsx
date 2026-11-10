export default function RegReferrals() {
  return (
    <div className="view">
      <div className="page-header"><div><h1 className="page-title">Направления и звонки</h1><p className="page-subtitle">Обработка направлений от врачей и запросов на обратный звонок.</p></div></div>
      <div className="dashboard-split">
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 16 }}>Направления от врачей</h3>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium text-dark text-sm">Пациент: Татьяна Гусева</div>
                <span className="badge badge-warning">К записи</span>
              </div>
              <div className="text-xs text-muted mb-1">От: Анна Иванова (Терапия)</div>
              <div className="text-xs text-primary font-medium">К: Петр Алексеев (Кардиология)</div>
              <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs text-muted">Осмотр</span>
                <button className="btn btn-outline btn-sm">Записать</button>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 16 }}>Очередь на обратный звонок</h3>
          <div className="callback-card new">
            <div className="flex justify-between items-start">
              <div className="font-bold text-dark text-base">+7 (918) 555-03-32</div>
              <span className="badge badge-new">Новый</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted mt-2"><span>Сайт</span><span>10:02</span></div>
            <div className="text-sm text-main mt-1">Анонимный запрос · Ожидание 18 мин</div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary w-100 btn-sm">Позвонить</button>
              <button className="btn btn-outline w-100 btn-sm">Обработано</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}