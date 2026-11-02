/** Каркас внутреннего приложения: сайдбар с меню по роли, хедер с пользователем. */

import { Button, Layout, Menu, Space, Typography } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth, useAuthActions } from "@pandora/shared";
import type { UserRole } from "@pandora/shared";

const MENU_BY_ROLE: Record<UserRole, { key: string; label: string }[]> = {
  registrar: [
    { key: "/morning", label: "Утро и кабинеты" },
    { key: "/patients", label: "Пациенты" },
    { key: "/appointments", label: "Запись и талоны" },
    { key: "/referrals", label: "Направления и перезвоны" },
  ],
  doctor: [
    { key: "/my-day", label: "Мой день" },
    { key: "/visit", label: "Приём" },
  ],
  admin: [
    { key: "/staff", label: "Персонал" },
    { key: "/directories", label: "Справочники" },
    { key: "/doctors", label: "Врачи и график" },
    { key: "/slots", label: "Слоты" },
    { key: "/exports", label: "Выгрузки" },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  registrar: "Регистратура",
  doctor: "Врач",
  admin: "Администратор",
};

export default function StaffLayout() {
  const user = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider theme="dark" width={220}>
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            padding: 16,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Пандора · Клиника
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={MENU_BY_ROLE[user.role]}
          onClick={({ key }) => navigate(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: "#fff", paddingInline: 24 }}>
          <Space size="large" style={{ float: "right" }}>
            <Typography.Text strong>{user.fullName}</Typography.Text>
            <Typography.Text type="secondary">
              {ROLE_LABEL[user.role]}
            </Typography.Text>
            <Button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Выйти
            </Button>
          </Space>
        </Layout.Header>
        <Layout.Content style={{ margin: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
