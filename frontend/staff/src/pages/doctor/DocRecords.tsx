import { useNavigate } from 'react-router-dom';

export default function DocRecords() {
  const navigate = useNavigate();

  // Демонстрационные данные для списка карт
  const records = [
    { id: 1, name: 'Анна Смирнова', date: '05 Ноя 2026', diagnosis: 'R51.9 Головная боль', status: 'Завершен' },
    { id: 2, name: 'Белла Фомина', date: '02 Ноя 2026', diagnosis: 'J06.9 ОРВИ', status: 'Завершен' },
    { id: 3, name: 'Даниил Лебедев', date: '28 Окт 2026', diagnosis: 'G44.2 Головная боль напряжения', status: 'Завершен' },
  ];

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Медицинские карты</h1>
          <p className="page-subtitle">История приемов и электронные карты ваших пациентов.</p>
        </div>
      </div>

      <div className="search-bar">
        <input type="text" className="input-field" placeholder="Поиск по ФИО или номеру СНИЛС..." />
        <button className="btn btn-primary">Найти</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Пациент</th>
                <th>Дата приема</th>
                <th>Основной диагноз</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        {record.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="font-medium text-dark">{record.name}</div>
                    </div>
                  </td>
                  <td className="text-muted">{record.date}</td>
                  <td>{record.diagnosis}</td>
                  <td>
                    <span className="badge badge-done">{record.status}</span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/staff/doc/record')}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}