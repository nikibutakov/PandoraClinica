/** Страница входа: AntD Form, ошибки бэка по-русски, редирект по роли через «/». */

import { Alert, Button, Card, Flex, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth, useAuthActions } from "@pandora/shared";

interface LoginForm {
  login: string;
  password: string;
}

export default function Login() {
  const { login } = useAuthActions();
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError("");
    try {
      await login(values.login, values.password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginTop: 0 }}>
          Пандора · Клиника
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          Вход для персонала
        </Typography.Paragraph>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
        <Form<LoginForm> layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="login"
            label="Логин"
            rules={[{ required: true, message: "Введите логин" }]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: "Введите пароль" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Войти
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
