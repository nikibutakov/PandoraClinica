/** Страница входа: логин/пароль через /api/auth/login, редирект по роли через «/». */

import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth, useAuthActions } from "@pandora/shared";

export default function Login() {
  const { login } = useAuthActions();
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginName.trim() || !password) {
      setError("Введите логин и пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginName.trim(), password);
      navigate(from !== "/staff/login" ? from : "/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--primary-bg)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          className="avatar"
          style={{
            background: "var(--primary)",
            color: "white",
            borderRadius: 6,
            width: 28,
            height: 28,
          }}
        >
          +
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--dark)",
            }}
          >
            pandora
          </div>
          <div
            style={{
              fontSize: "0.55rem",
              letterSpacing: 1,
              color: "var(--text-muted)",
            }}
          >
            ПОЛИКЛИНИКА
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleLogin(e)}
        style={{
          background: "var(--white)",
          padding: 32,
          borderRadius: 16,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{ fontSize: "1.5rem", marginBottom: 6, color: "var(--dark)" }}
        >
          С возвращением.
        </h1>
        <p
          className="text-muted"
          style={{ marginBottom: 20, fontSize: "0.85rem" }}
        >
          Войдите в рабочее пространство.
        </p>

        <div className="input-group">
          <label>Логин</label>
          <input
            type="text"
            className="input-field"
            autoComplete="username"
            autoFocus
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Пароль</label>
          <input
            type="password"
            className="input-field"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-danger text-sm" style={{ margin: "4px 0 12px" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: "100%",
            padding: 10,
            fontSize: "0.9rem",
            marginTop: 8,
            marginBottom: 12,
          }}
          disabled={loading}
        >
          {loading ? "Входим…" : "Войти"}
        </button>

        {/* Кнопка открытия табло в новой вкладке */}
        <button
          type="button"
          className="btn btn-outline"
          style={{
            width: "100%",
            padding: 10,
            fontSize: "0.9rem",
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={() => window.open("/board", "_blank")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Включить информационное табло
        </button>
      </form>
    </div>
  );
}
