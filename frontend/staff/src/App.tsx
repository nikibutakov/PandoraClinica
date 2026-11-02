/** Маршруты внутреннего приложения: вход, редирект по роли, разделы с guard'ами. */

import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { homePathByRole, RequireRole, setOnUnauthorized, useAuth, useAuthActions } from "@pandora/shared";

import StaffLayout from "./layout/StaffLayout";
import Login from "./pages/Login";
import Stub from "./pages/Stub";

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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />

        <Route element={<RequireRole roles={["registrar"]}><StaffLayout /></RequireRole>}>
          <Route path="/morning" element={<Stub title="Утро и кабинеты" plan="E1" />} />
          <Route path="/patients" element={<Stub title="Пациенты" plan="E2" />} />
          <Route path="/appointments" element={<Stub title="Запись и талоны" plan="E3" />} />
          <Route path="/referrals" element={<Stub title="Направления и перезвоны" plan="E4" />} />
        </Route>

        <Route element={<RequireRole roles={["doctor"]}><StaffLayout /></RequireRole>}>
          <Route path="/my-day" element={<Stub title="Мой день" plan="E5" />} />
          <Route path="/visit" element={<Stub title="Приём" plan="E6" />} />
        </Route>

        <Route element={<RequireRole roles={["admin"]}><StaffLayout /></RequireRole>}>
          <Route path="/staff" element={<Stub title="Персонал" plan="E8" />} />
          <Route path="/directories" element={<Stub title="Справочники" plan="E9" />} />
          <Route path="/doctors" element={<Stub title="Врачи и график" plan="E10" />} />
          <Route path="/slots" element={<Stub title="Слоты" plan="E11" />} />
          <Route path="/exports" element={<Stub title="Выгрузки" plan="E12" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
