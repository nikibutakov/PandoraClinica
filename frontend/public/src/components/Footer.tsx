import { Link } from "react-router-dom";
import { useUI } from "../context/UIContext";

export default function Footer() {
  const { openModal } = useUI();

  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <div className="logo-icon">+</div>
              <div>
                pandora<span>POLYCLINIC</span>
              </div>
            </Link>
            <p>Более личный подход к повседневному здоровью.</p>
          </div>
          <div className="footer-col">
            <h4>Навигация</h4>
            <ul>
              <li>
                <Link to="/services">Наши услуги</Link>
              </li>
              <li>
                <Link to="/about">Наш подход</Link>
              </li>
              <li>
                <Link to="/schedule">Расписание</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Связаться с нами</h4>
            <ul>
              <li>
                <a
                  href="tel:+79991234567"
                  style={{ fontWeight: 600, color: "var(--dark)" }}
                >
                  +7 (999) 123-45-67
                </a>
              </li>
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    openModal();
                  }}
                  style={{ color: "var(--primary)" }}
                >
                  Записаться на прием ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © 2026 Pandora Polyclinic. Клиническая концепция с вымышленными
            контактными данными.
          </p>
          <a href="#">Конфиденциальность и информация</a>
        </div>
      </div>
    </footer>
  );
}
