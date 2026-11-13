/** Маршруты внутреннего приложения (UI-каркас ветки dev + гварды по ролям). */

import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  homePathByRole,
  RequireRole,
  setOnUnauthorized,
  useAuth,
  useAuthActions,
} from "@pandora/shared";

import Layout from "./components/Layout";
import Login from "./pages/Login";

// Администратор
import AdminStaff from "./pages/admin/AdminStaff";
import AdminDirs from "./pages/admin/AdminDirs";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminSlots from "./pages/admin/AdminSlots";
import AdminExports from "./pages/admin/AdminExports";

// Регистратор
import RegShift from "./pages/registrar/RegShift";
import RegPatients from "./pages/registrar/RegPatients";
import RegBooking from "./pages/registrar/RegBooking";
import RegReferrals from "./pages/registrar/RegReferrals";

// Врач
import DocMyDay from "./pages/doctor/DocMyDay";
import DocRecord from "./pages/doctor/DocRecord";

// Табло
import Board from "./pages/board/Board";

/** «/» и «/staff» отправляют на домашнюю страницу по роли вошедшего. */
function Home() {
  const user = useAuth();
  if (!user) return <Navigate to="/staff/login" replace />;
  return <Navigate to={homePathByRole(user.role)} replace />;
}

/** Подписка на 401 от API: разлогин и переход на страницу входа. */
function UnauthorizedWatchdog() {
  const { logout } = useAuthActions();
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      window.location.assign("/staff/login");
    });
  }, [logout]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <UnauthorizedWatchdog />
      <Routes>
        {/* Табло для ТВ — без авторизации: киоск в холле, доступ режет nginx (D2) */}
        <Route path="/board" element={<Board />} />
        <Route path="/staff/login" element={<Login />} />
        <Route path="/" element={<Home />} />

        {/* Регистратор */}
        <Route
          element={
            <RequireRole roles={["registrar", "admin"]}>
              <Layout />
            </RequireRole>
          }
        >
          <Route path="/staff/reg/shift" element={<RegShift />} />
          <Route path="/staff/reg/patients" element={<RegPatients />} />
          <Route path="/staff/reg/booking" element={<RegBooking />} />
          <Route path="/staff/reg/referrals" element={<RegReferrals />} />
        </Route>

        {/* Врач */}
        <Route
          element={
            <RequireRole roles={["doctor"]}>
              <Layout />
            </RequireRole>
          }
        >
          <Route path="/staff/doc/myday" element={<DocMyDay />} />
          <Route path="/staff/doc/record" element={<DocRecord />} />
        </Route>

        {/* Администратор */}
        <Route
          element={
            <RequireRole roles={["admin"]}>
              <Layout />
            </RequireRole>
          }
        >
          <Route path="/staff/admin/staff" element={<AdminStaff />} />
          <Route path="/staff/admin/dirs" element={<AdminDirs />} />
          <Route path="/staff/admin/doctors" element={<AdminDoctors />} />
          <Route path="/staff/admin/slots" element={<AdminSlots />} />
          <Route path="/staff/admin/exports" element={<AdminExports />} />
        </Route>

        <Route path="/staff" element={<Home />} />
        <Route path="*" element={<Navigate to="/staff/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}
