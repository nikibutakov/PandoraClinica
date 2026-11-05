import { Link, useLocation } from "react-router-dom";
import { useUI } from "../context/UIContext";

export default function Header() {
  const { openMenu } = useUI();
  const { pathname } = useLocation();

  const getClass = (path: string) => (pathname === path ? "active" : "");

  return (
    <header>
      <div className="container header-inner">
        <Link to="/" className="logo">
          <div className="logo-icon">+</div>
          <div>
            pandora<span>POLYCLINIC</span>
          </div>
        </Link>
        <nav className="nav-links">
          <Link to="/services" className={getClass("/services")}>
            Наши услуги
          </Link>
          <Link to="/about" className={getClass("/about")}>
            Наш подход
          </Link>
          <Link to="/schedule" className={getClass("/schedule")}>
            Расписание
          </Link>
        </nav>
        <div className="header-contact">
          <a href="tel:+79991234567" className="phone-link">
            <span>Позвоните нам</span>
            +7 (999) 123-45-67
          </a>
          <button className="menu-btn" onClick={openMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
