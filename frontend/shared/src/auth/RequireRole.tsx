/** Guard маршрутов: без сессии — на логин, без роли — «Нет доступа». */

import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "./context";
import type { UserRole } from "./user";

export function RequireRole({
  roles,
  children,
}: {
  roles?: UserRole[];
  children: ReactNode;
}) {
  const user = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/staff/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{ padding: 48, fontFamily: "sans-serif" }}>
        <h2>Нет доступа</h2>
        <p>Раздел доступен только роли: {roles.join(", ")}.</p>
      </div>
    );
  }
  return children;
}
