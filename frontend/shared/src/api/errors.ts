/** Разбор тела ошибки API в сообщение для пользователя (русский текст). */

interface ErrorBody {
  detail?: unknown;
}

interface ValidationItem {
  msg?: string;
}

/**
 * Форматирует тело ошибки ответа: строковый detail бэк уже отдаёт по-русски,
 * 422 — массив pydantic-ошибок, остальное — общий шаблон с кодом статуса.
 */
export function formatApiError(body: unknown, status: number): string {
  const detail = (body as ErrorBody | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof (item as ValidationItem)?.msg === "string"
          ? (item as ValidationItem).msg
          : null,
      )
      .filter((msg): msg is string => msg !== null);
    if (messages.length > 0) return messages.join("; ");
  }
  if (status === 401) return "Сессия истекла — войдите снова";
  return `Ошибка запроса (код ${status})`;
}
