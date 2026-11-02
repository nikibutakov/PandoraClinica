/**
 * Временная проверка каркаса (F1–F2): типизированный запрос к живому бэкенду
 * через Vite-прокси. В PR F3–F4 заменяется полноценным каркасом с логином.
 */

import { useEffect, useState } from "react";

import { api, formatApiError } from "@pandora/shared";

export default function App() {
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.GET("/api/public/specializations").then(({ data, error: body, response }) => {
      if (data) setSpecializations(data.map((item) => item.name));
      else setError(formatApiError(body, response.status));
    });
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 32 }}>
      <h1>Пандора · Клиника — внутреннее приложение</h1>
      <p>Проверка типизированного API-клиента (GET /api/public/specializations):</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!error && (
        <ul>
          {specializations.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
