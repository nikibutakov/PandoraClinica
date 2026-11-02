/** Табло очереди для ТВ: тёмный киоск-режим, без авторизации (экран E7 плана). */

import { ConfigProvider, Flex, Typography } from "antd";
import { theme } from "antd";
import { Link } from "react-router-dom";

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
        <Link to="/" style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 }}>
          ← На сайт клиники
        </Link>
      </Flex>
    </ConfigProvider>
  );
}
