/** Типизированный API-клиент поликлиники: авторизация и русские сообщения об ошибках. */

import createClient from "openapi-fetch";

import type { paths } from "./schema";

/** Ключ токена в localStorage. */
export const TOKEN_KEY = "pandora_token";

let onUnauthorized: (() => void) | null = null;

/** Приложение подписывается: 401 на закрытом эндпоинте → разлогин и редирект на /login. */
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

export const api = createClient<paths>();

api.use({
  onRequest({ request }) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ request, response }) {
    // 401 от логина — это «неверный пароль», а не истёкшая сессия: там не разлогиниваем
    const isLogin = new URL(request.url, window.location.origin).pathname === "/api/auth/login";
    if (response.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return undefined;
  },
});
