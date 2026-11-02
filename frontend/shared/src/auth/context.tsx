/** Auth-контекст: логин через /api/auth/login, токен в localStorage, выход. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, TOKEN_KEY } from "../api/client";
import { formatApiError } from "../api/errors";
import { restoreUser, USER_KEY } from "./user";
import type { AuthUser } from "./user";

interface AuthContextValue {
  user: AuthUser | null;
  /** Вход; при ошибке бросает Error с русским сообщением. */
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthUser | null>(null);

const AuthActionsContext = createContext<Pick<AuthContextValue, "login" | "logout">>({
  login: async () => undefined,
  logout: () => undefined,
});

function persist(user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clear(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => restoreUser());

  const login = useCallback(async (loginName: string, password: string) => {
    const { data, error, response } = await api.POST("/api/auth/login", {
      body: { login: loginName, password },
    });
    if (data) {
      const next: AuthUser = { token: data.access_token, role: data.role, fullName: data.full_name };
      persist(next);
      setUser(next);
      return;
    }
    throw new Error(formatApiError(error, response.status));
  }, []);

  const logout = useCallback(() => {
    clear();
    setUser(null);
  }, []);

  const actions = useMemo(() => ({ login, logout }), [login, logout]);

  return (
    <AuthContext.Provider value={user}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthContext.Provider>
  );
}

/** Текущий пользователь или null. */
export function useAuth(): AuthUser | null {
  return useContext(AuthContext);
}

/** Действия сессии: login/logout. */
export function useAuthActions(): Pick<AuthContextValue, "login" | "logout"> {
  return useContext(AuthActionsContext);
}
