/**
 * Табло очереди для ТВ (экран E7): тёмный киоск-режим без авторизации.
 * Опрашивает GET /api/board каждые 5 секунд; вызванный номер — с подсветкой.
 * Доступ ограничивается на уровне сети/nginx (D2), не логином.
 */

import { useEffect, useState } from "react";
import { ConfigProvider, Flex, Typography, theme } from "antd";
import { api } from "@pandora/shared";
import type { components } from "@pandora/shared";

type BoardOut = components["schemas"]["BoardOut"];

const POLL_MS = 5000;

const WEEKDAYS = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

/** «5 ноября 2026, четверг» из даты ответа API. */
function formatBoardDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("ru-RU", { month: "long" })} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`;
}

function Board() {
  const [data, setData] = useState<BoardOut | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // опрос табло: раз в 5 секунд; при сбое держим последние данные
    const poll = async () => {
      const { data: body } = await api.GET("/api/board");
      if (cancelled) return;
      if (body) {
        setData(body);
        setOffline(false);
      } else {
        setOffline(true);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Flex
        vertical
        gap={24}
        style={{ minHeight: "100vh", background: "#001529", padding: 32 }}
      >
        <Flex align="baseline" justify="space-between">
          <Typography.Text
            strong
            style={{ color: "#fff", fontSize: 40, letterSpacing: 2 }}
          >
            ПАНДОРА · КЛИНИКА
          </Typography.Text>
          {data && (
            <Typography.Text
              type="secondary"
              style={{ color: "rgba(255,255,255,0.45)", fontSize: 22 }}
            >
              {formatBoardDate(data.date)}
              {offline && " · нет связи, показаны последние данные"}
            </Typography.Text>
          )}
        </Flex>

        {data === null ? (
          offline ? (
            <Typography.Text
              style={{ color: "rgba(255,255,255,0.85)", fontSize: 28 }}
            >
              Нет связи с сервером — проверьте подключение
            </Typography.Text>
          ) : (
            <Typography.Text
              style={{ color: "rgba(255,255,255,0.85)", fontSize: 28 }}
            >
              Загрузка…
            </Typography.Text>
          )
        ) : data.rooms.length === 0 ? (
          <Typography.Text
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 28 }}
          >
            Смены ещё не открыты — кабинеты не закреплены
          </Typography.Text>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 24,
              flex: 1,
              alignContent: "start",
            }}
          >
            {data.rooms.map((room) => (
              <div
                key={room.workday_id}
                style={{
                  background: "#00284d",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <Flex align="center" justify="space-between">
                  <Typography.Text
                    strong
                    style={{ color: "#fff", fontSize: 30 }}
                  >
                    Кабинет {room.room_number}
                  </Typography.Text>
                  <Typography.Text
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 18,
                      textAlign: "right",
                    }}
                  >
                    {room.specialization_name ?? ""}
                    <br />
                    {room.doctor_name ?? ""}
                  </Typography.Text>
                </Flex>

                {room.current.length > 0 ? (
                  <Flex
                    align="center"
                    gap={24}
                    style={{
                      background: "#13c2c2",
                      borderRadius: 12,
                      padding: "12px 24px",
                    }}
                  >
                    <Typography.Text
                      style={{
                        color: "#001529",
                        fontSize: 96,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {room.current.map((t) => t.number).join("  ")}
                    </Typography.Text>
                    <Typography.Text
                      strong
                      style={{ color: "#001529", fontSize: 26 }}
                    >
                      пройдите
                      <br />в кабинет
                    </Typography.Text>
                  </Flex>
                ) : (
                  <Flex
                    align="center"
                    style={{
                      border: "1px dashed rgba(255,255,255,0.25)",
                      borderRadius: 12,
                      padding: "20px 24px",
                    }}
                  >
                    <Typography.Text
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 26,
                      }}
                    >
                      Ожидайте вызова
                    </Typography.Text>
                  </Flex>
                )}

                <Flex align="center" gap={12} wrap="wrap">
                  <Typography.Text
                    style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}
                  >
                    Очередь:
                  </Typography.Text>
                  {room.waiting_numbers.length === 0 ? (
                    <Typography.Text
                      style={{ color: "rgba(255,255,255,0.45)", fontSize: 22 }}
                    >
                      пусто
                    </Typography.Text>
                  ) : (
                    room.waiting_numbers.map((number) => (
                      <Typography.Text
                        key={number}
                        style={{
                          color: "#fff",
                          fontSize: 32,
                          fontWeight: 600,
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: 8,
                          padding: "2px 14px",
                        }}
                      >
                        {number}
                      </Typography.Text>
                    ))
                  )}
                </Flex>
              </div>
            ))}
          </div>
        )}
      </Flex>
    </ConfigProvider>
  );
}

export default Board;
