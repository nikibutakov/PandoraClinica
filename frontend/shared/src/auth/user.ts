/** Пользователь сессии и разбор JWT без внешних зависимостей. */

import type { components } from "../api/schema";

export type UserRole = components["schemas"]["UserRole"];

export interface AuthUser {
  token: string;
  role: UserRole;
  fullName: string;
}

/** Ключ кэша профиля в localStorage (токен лежит отдельно — см. TOKEN_KEY). */
export const USER_KEY = "pandora_user";

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
}

/** Разбирает payload JWT (base64url, UTF-8). Возвращает null для битого токена. */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Домашний маршрут по роли (после входа и на «/»). */
export function homePathByRole(role: UserRole): string {
  switch (role) {
    case "doctor":
      return "/staff/doc/myday";
    case "admin":
      return "/staff/admin/staff";
    default:
      return "/staff/reg/shift";
  }
}

/** Восстанавливает сохранённую сессию; проверяет срок жизни токена. */
export function restoreUser(): AuthUser | null {
  const token = localStorage.getItem("pandora_token");
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    const payload = parseJwt(token);
    if (!user.token || user.token !== token || !payload) return null;
    if (payload.exp !== undefined && payload.exp * 1000 < Date.now())
      return null;
    return user;
  } catch {
    return null;
  }
}
