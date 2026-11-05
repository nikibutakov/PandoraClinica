/**
 * Табло очереди для ТВ (экран E7): тёмный киоск-режим без авторизации.
 * Решение команды: табло — часть внутреннего приложения (staff).
 * Доступ ограничивается на уровне сети/nginx (D2), не логином.
 * Живые данные подключаются на экране E7 из GET /api/board.
 */

import { ConfigProvider, Flex, Typography } from "antd";
import { theme } from "antd";

export default function Board() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Flex
        vertical
        align="center"
        justify="center"
        gap={24}
        style={{ minHeight: "100vh", background: "#001529" }}
      >
        <Typography.Title style={{ color: "#fff", fontSize: 64, margin: 0 }}>
          ТАБЛО ОЧЕРЕДИ
        </Typography.Title>
        <Typography.Text
          style={{ color: "rgba(255,255,255,0.65)", fontSize: 24 }}
        >
          Кабинеты, принимающие врачи и вызываемые номера появятся здесь (E7)
        </Typography.Text>
      </Flex>
    </ConfigProvider>
  );
}
