import { Link } from "react-router-dom";
import { useUI } from "../context/UIContext";
import Reveal from "../components/Reveal";

export default function Services() {
  const { openModal } = useUI();

  return (
    <div className="page">
      <div className="container" style={{ paddingBottom: 60 }}>
        <div className="breadcrumbs">
          <Link to="/">Главная</Link> / Услуги
        </div>
        <div className="tag">Забота, объединяющая</div>
        <h1 style={{ marginBottom: 20 }}>Наши услуги</h1>
        <p className="subtitle" style={{ maxWidth: 800, marginBottom: 40 }}>
          Разные потребности. Одно гостеприимное место. Изучите варианты помощи
          для вас и вашей семьи с четкой отправной точкой для каждого визита.
        </p>

        <Reveal className="services-grid">
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
              </div>
              <span className="service-badge">Консультация терапевта</span>
            </div>
            <h3>Общая медицина</h3>
            <p>
              Вдумчивая первая помощь при повседневных проблемах со здоровьем,
              осмотры и постоянный уход.
            </p>
            <div className="service-footer">
              <span className="price">от 1500 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <span className="service-badge">Анализы и проверки</span>
            </div>
            <h3>Диагностика</h3>
            <p>
              Лабораторные анализы и проверки здоровья, которые помогут вам и
              вашему врачу понять, что делать дальше.
            </p>
            <div className="service-footer">
              <span className="price">от 1200 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="service-badge">Консультация педиатра</span>
            </div>
            <h3>Педиатрия</h3>
            <p>
              Вдумчивая поддержка для маленьких людей и тех, кто их воспитывает,
              на каждом этапе.
            </p>
            <div className="service-footer">
              <span className="price">от 1800 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </div>
              <span className="service-badge">Консультация кардиолога</span>
            </div>
            <h3>Кардиология</h3>
            <p>
              Время поговорить о здоровье сердца, симптомах и плане ваших
              дальнейших действий.
            </p>
            <div className="service-footer">
              <span className="price">от 2200 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 8v8"></path>
                  <path d="M8 12h8"></path>
                </svg>
              </div>
              <span className="service-badge">Консультация гинеколога</span>
            </div>
            <h3>Женское здоровье</h3>
            <p>
              Личные беседы, профилактическая помощь и поддержка на протяжении
              всей жизни.
            </p>
            <div className="service-footer">
              <span className="price">от 2000 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <span className="service-badge">
                Профилактическая консультация
              </span>
            </div>
            <h3>Профилактика</h3>
            <p>
              Немного времени для вашего здоровья сегодня. Обсудите рутинные
              проверки и важные привычки.
            </p>
            <div className="service-footer">
              <span className="price">от 1500 ₽</span>
              <button
                className="btn btn-outline"
                style={{ padding: "8px 16px" }}
                onClick={openModal}
              >
                Записаться ↗
              </button>
            </div>
          </div>
        </Reveal>

        <div
          style={{
            background: "var(--bg-light)",
            padding: "24px 32px",
            borderRadius: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 40,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ color: "var(--primary)" }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>
                Не уверены, с чего начать?
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                }}
              >
                Настоящий разговор может помочь вам найти правильную отправную
                точку.
              </p>
            </div>
          </div>
          <a
            href="tel:+79991234567"
            style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "var(--dark)",
            }}
          >
            +7 (999) 123-45-67
          </a>
        </div>
      </div>
    </div>
  );
}
