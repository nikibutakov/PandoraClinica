import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";

import "@ant-design/v5-patch-for-react-19";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={ruRU}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
