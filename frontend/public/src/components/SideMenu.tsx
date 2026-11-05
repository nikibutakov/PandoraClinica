import { Drawer } from "antd";
import { Link } from "react-router-dom";
import { useUI } from "../context/UIContext";

export default function SideMenu() {
  const { isMenuOpen, closeMenu, openModal } = useUI();

  return (
    <Drawer
      placement="right"
      onClose={closeMenu}
      open={isMenuOpen}
      width={400}
      closable={false}
      styles={{ body: { padding: 40 } }}
    >
      <div className="side-menu-header">
        <div className="tag">Изучить Pandora</div>
        <button className="close-btn" onClick={closeMenu}>
          &times;
        </button>
      </div>

      {/* ИЗМЕНЕН ПОРЯДОК */}
      <div className="side-menu-links">
        <Link to="/" onClick={closeMenu}>
          Главная <span>↗</span>
        </Link>
        <Link to="/services" onClick={closeMenu}>
          Услуги <span>↗</span>
        </Link>
        <Link to="/schedule" onClick={closeMenu}>
          Часы работы <span>↗</span>
        </Link>
        <Link to="/about" onClick={closeMenu}>
          О нас <span>↗</span>
        </Link>
      </div>

      <div className="side-menu-contact">
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          Не знаете, с чего начать?
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Поговорите с ресепшн. Мы поможем найти нужного специалиста.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={openModal}
        >
          Записаться на прием ↗
        </button>
        <div style={{ marginTop: 24, fontWeight: 600, fontSize: "1.25rem" }}>
          +7 (999) 123-45-67
        </div>
      </div>
    </Drawer>
  );
}
