import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useUI } from "../context/UIContext";
import Reveal from "../components/Reveal";
import { api, formatApiError } from "@pandora/shared";

/** Одна строка расписания: специальность и агрегат её свободных слотов. */
interface RowType {
  key: string;
  specialty: React.ReactNode;
  days: string;
  time: string;
}

/** Короткие и полные названия дней (понедельник — первый). */
const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS_FULL = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

/** Иконка специальности: известным — своя, остальным — общая. */
function specialtyIcon(name: string): React.ReactNode {
  const paths: Record<string, string> = {
    Терапия: "M22 12h-4l-3 9L9 3l-3 9H2",
    Кардиология:
      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    УЗИ: "M22 12h-4l-3 9L9 3l-3 9H2",
    Хирургия:
      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  };
  const path =
    paths[name] ??
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d={path}></path>
    </svg>
  );
}

/** «Пн, Ср, Пт» / «Пн – Пт» из отсортированных индексов дней недели. */
function formatWeekdays(indices: number[]): string {
  if (indices.length === 0) return "—";
  const runs: number[][] = [];
  for (const i of indices) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  }
  return runs
    .map((run) =>
      run.length >= 3
        ? `${WEEKDAYS_SHORT[run[0]]} – ${WEEKDAYS_SHORT[run[run.length - 1]]}`
        : run.map((i) => WEEKDAYS_FULL[i]).join(", "),
    )
    .join(", ");
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Индекс дня недели, где 0 — понедельник (из Date.getDay(), где 0 — воскресенье). */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;
const hhmm = (iso: string) => iso.slice(11, 16);

interface SpecialtyAgg {
  id: number;
  name: string;
  slots: number;
  days: string;
  time: string;
}

export default function Schedule() {
  const { openModal } = useUI();
  const [rows, setRows] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // кнопка «Повторить» увеличивает счётчик — эффект перезапускает загрузку
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const {
        data: specializations,
        error: specError,
        response: specResponse,
      } = await api.GET("/api/public/specializations");
      if (cancelled) return;
      if (!specializations) {
        setError(formatApiError(specError, specResponse.status));
        setLoading(false);
        return;
      }

      const today = new Date();
      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + 13); // слоты демо-сида сгенерированы на 14 дней

      const aggregates = await Promise.all(
        specializations.map(async (spec): Promise<SpecialtyAgg> => {
          const { data: slots } = await api.GET("/api/public/schedule", {
            params: {
              query: {
                specialization_id: spec.id,
                date_from: isoDate(today),
                date_to: isoDate(horizon),
              },
            },
          });
          if (!slots || slots.length === 0) {
            return {
              id: spec.id,
              name: spec.name,
              slots: 0,
              days: "—",
              time: "—",
            };
          }
          const daySet = new Set(
            slots.map((s) => mondayIndex(new Date(s.starts_at))),
          );
          const first = hhmm(slots[0].starts_at);
          const last = hhmm(slots[slots.length - 1].ends_at);
          return {
            id: spec.id,
            name: spec.name,
            slots: slots.length,
            days: formatWeekdays([...daySet].sort((a, b) => a - b)),
            time: `${first} – ${last}`,
          };
        }),
      );

      setRows(
        aggregates.map((agg) => ({
          key: String(agg.id),
          specialty: (
            <div className="specialty-cell">
              <div className="specialty-icon">{specialtyIcon(agg.name)}</div>
              <div className="specialty-info">
                <h4>{agg.name}</h4>
                <p>
                  {agg.slots > 0
                    ? `Свободных слотов на 2 недели: ${agg.slots}`
                    : "Нет свободных слотов на ближайшие 2 недели"}
                </p>
              </div>
            </div>
          ),
          days: agg.days,
          time: agg.time,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const columns: ColumnsType<RowType> = [
    { title: "Специальность", dataIndex: "specialty", key: "specialty" },
    { title: "Дни", dataIndex: "days", key: "days" },
    {
      title: "Время",
      dataIndex: "time",
      key: "time",
      render: (text: string) => (
        <span style={{ color: "var(--primary)", fontWeight: 500 }}>{text}</span>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="container" style={{ paddingBottom: 80 }}>
        <div className="breadcrumbs">
          <Link to="/">Главная</Link> / График работы
        </div>
        <div className="tag">Спланируйте визит</div>
        <h1 style={{ marginBottom: 20 }}>Расписание приемов</h1>
        <p className="subtitle" style={{ maxWidth: 800, marginBottom: 40 }}>
          Найдите время для нужной вам помощи. Ресепшн поможет вам выбрать
          специальность и подтвердить запись.
        </p>

        <Reveal className="schedule-container" style={{ padding: 0 }}>
          <div className="schedule-header">
            <h3 style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Найдите свою специальность
            </h3>
            <span
              style={{
                background: "var(--primary-light)",
                color: "var(--primary)",
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: "0.8rem",
                fontWeight: 500,
              }}
            >
              Прием по записи
            </span>
          </div>

          {error ? (
            <div style={{ padding: 24 }}>
              <Alert
                type="error"
                message={error}
                showIcon
                action={
                  <button
                    className="btn btn-primary"
                    style={{ padding: "6px 16px" }}
                    onClick={() => {
                      setLoading(true);
                      setError("");
                      setReloadCount((n) => n + 1);
                    }}
                  >
                    Повторить
                  </button>
                }
              />
            </div>
          ) : loading ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 64 }}
            >
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={rows}
              pagination={false}
              style={{ borderRadius: "0 0 24px 24px", overflow: "hidden" }}
            />
          )}
        </Reveal>

        <Reveal
          className="cta-banner"
          style={{ background: "var(--primary-light)" }}
        >
          <div className="cta-content">
            <h2 style={{ color: "var(--dark)" }}>
              Давайте найдем время, которое вам подходит.
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Не знаете, к какому специалисту обратиться? Начните с разговора с
              ресепшн.
            </p>
          </div>
          <div className="cta-actions">
            <button
              className="btn btn-primary"
              style={{ padding: "16px 32px", fontSize: "1.1rem" }}
              onClick={openModal}
            >
              Записаться на прием ↗
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
