import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";

import "@ant-design/v5-patch-for-react-19";
import { AuthProvider } from "@pandora/shared";

import App from "./App";

// русские названия дней недели/месяцев в dayjs (датапикеры и таблицы)
dayjs.locale("ru");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={ruRU}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
