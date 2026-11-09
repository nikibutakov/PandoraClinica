import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";

export default function About() {
  return (
    <div className="page">
      <div className="container" style={{ paddingBottom: 80 }}>
        <div className="breadcrumbs">
          <Link to="/">Главная</Link> / О нас
        </div>
        <div className="tag">Подход Pandora</div>
        <h1 style={{ marginBottom: 20 }}>О поликлинике Pandora</h1>
        <p className="subtitle" style={{ maxWidth: 800, marginBottom: 40 }}>
          Индивидуальная забота, четкие беседы и гостеприимное место для начала.
          Это идея, лежащая в основе Pandora.
        </p>

        <div className="about-split">
          <div className="about-split-text">
            <div className="tag">Люди на первом месте. Всегда.</div>
            <h2>Хорошая забота начинается с того, что вас слышат.</h2>
            <p className="subtitle" style={{ marginTop: 16 }}>
              Ваши вопросы, ваша повседневная жизнь, ваша следующая глава. Здесь
              есть место для всего этого.
            </p>
          </div>
          <div className="about-split-img">
            <img
              src="https://avatars.mds.yandex.net/get-altay/5583647/2a0000017e76fa3c640deca34dd28dc0e265/XXXL"
              alt="Интерьер клиники"
            />
          </div>
        </div>

        <Reveal className="about-grid">
          <div>
            <div className="about-grid-icon">
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
            <div
              className="tag"
              style={{ marginBottom: 8, fontSize: "0.7rem" }}
            >
              Наша миссия
            </div>
            <h3 style={{ marginBottom: 12 }}>Забота с личным подходом</h3>
            <p style={{ color: "var(--text-muted)" }}>
              Сделайте повседневную медицину более понятной. Мы считаем, что
              забота должна начинаться с выслушивания и оставлять вас с четким,
              совместным планом на будущее.
            </p>
          </div>
          <div>
            <div className="about-grid-icon">
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
            <div
              className="tag"
              style={{ marginBottom: 8, fontSize: "0.7rem" }}
            >
              Наша история
            </div>
            <h3 style={{ marginBottom: 12 }}>
              Простая идея, продуманная до мелочей
            </h3>
            <p style={{ color: "var(--text-muted)" }}>
              История Pandora начинается с концепции клиники: объединить
              повседневные консультации, семейную медицину и диагностику в одном
              гостеприимном месте, с людьми в центре внимания.
            </p>
          </div>
          <div>
            <div className="about-grid-icon">
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
            <div
              className="tag"
              style={{ marginBottom: 8, fontSize: "0.7rem" }}
            >
              Наши ценности
            </div>
            <h3 style={{ marginBottom: 12 }}>
              Уважение. Ясность. Партнерство.
            </h3>
            <p style={{ color: "var(--text-muted)" }}>
              Место для вопросов. Объяснения простым языком. Решения,
              принимаемые вместе. Эти принципы формируют то, как мы думаем о
              каждом визите, большом или маленьком.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
