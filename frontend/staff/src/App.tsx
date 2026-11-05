/** Маршруты внутреннего приложения: вход, редирект по роли, разделы с guard'ами. */

import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  homePathByRole,
  RequireRole,
  setOnUnauthorized,
  useAuth,
  useAuthActions,
} from "@pandora/shared";

import StaffLayout from "./layout/StaffLayout";
import Appointments from "./pages/Appointments";
import Board from "./pages/Board";
import Login from "./pages/Login";
import Morning from "./pages/Morning";
import MyDay from "./pages/MyDay";
import Patients from "./pages/Patients";
import Stub from "./pages/Stub";
import Visit from "./pages/Visit";

/** «/» отправляет на домашнюю страницу по роли вошедшего. */
function Home() {
  const user = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathByRole(user.role)} replace />;
}

/** Подписка на 401 от API: разлогин и переход на страницу входа. */
function UnauthorizedWatchdog() {
  const { logout } = useAuthActions();
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      window.location.assign("/login");
    });
  }, [logout]);
  return null;
}

export default function App() {
  return (
    <>
      <UnauthorizedWatchdog />
      <Routes>
        {/* Табло для ТВ — без авторизации: киоск в холле, доступ режет nginx (D2) */}
        <Route path="/board" element={<Board />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />

        <Route
          element={
            <RequireRole roles={["registrar"]}>
              <StaffLayout />
            </RequireRole>
          }
        >
          <Route path="/morning" element={<Morning />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route
            path="/referrals"
            element={<Stub title="Направления и перезвоны" plan="E4" />}
          />
        </Route>

        <Route
          element={
            <RequireRole roles={["doctor"]}>
              <StaffLayout />
            </RequireRole>
          }
        >
          <Route path="/my-day" element={<MyDay />} />
          <Route path="/visit" element={<Visit />} />
        </Route>

        <Route
          element={
            <RequireRole roles={["admin"]}>
              <StaffLayout />
            </RequireRole>
          }
        >
          <Route path="/staff" element={<Stub title="Персонал" plan="E8" />} />
          <Route
            path="/directories"
            element={<Stub title="Справочники" plan="E9" />}
          />
          <Route
            path="/doctors"
            element={<Stub title="Врачи и график" plan="E10" />}
          />
          <Route path="/slots" element={<Stub title="Слоты" plan="E11" />} />
          <Route
            path="/exports"
            element={<Stub title="Выгрузки" plan="E12" />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
