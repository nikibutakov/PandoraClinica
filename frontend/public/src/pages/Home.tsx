import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import FAQList from '../components/FAQList';
import { useUI } from '../context/UIContext';

const faqData = [
  { question: 'Могу ли я запросить обратный звонок, не называя своего имени?', answer: 'Да. Просто оставьте номер телефона. Вам не нужно указывать свое имя или медицинские данные, чтобы запросить звонок. Ваш номер используется для организации обратного звонка.' },
  { question: 'Что мне взять с собой на первый прием?', answer: 'Пожалуйста, возьмите с собой документ, удостоверяющий личность, и, если у вас есть, результаты предыдущих анализов или выписки от других врачей.' },
  { question: 'Как мне найти нужный тип приема?', answer: 'Если вы не уверены, с чего начать, просто позвоните нам или оставьте заявку на обратный звонок. Наша команда ресепшн поможет вам выбрать подходящего специалиста.' }
];

export default function Home() {
  const { openModal } = useUI();

  return (
    <div className="page">
      <div className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="tag">Немного заботы. Большая разница.</div>
            <h1>Ваше здоровье.<br/>Немного больше<br/>личного.</h1>
            <p className="subtitle" style={{ marginBottom: 32 }}>Вдумчивая забота для каждой главы жизни. Сделаем ваш следующий шаг к хорошему самочувствию простым.</p>
            <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={openModal}>
              Записаться на прием ↗
            </button>
            <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--primary)' }}></span>
              Настоящий разговор. Без создания онлайн-аккаунта.
            </p>
          </div>
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Врачи" />
            <div className="floating-card">
              <div className="floating-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Люди на первом месте.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Пространство для разговора. Время слушать.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="features">
        <Reveal className="container features-grid">
          <div className="feature-item">
            <div className="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div>
            <div className="feature-text"><h4>Забота для всей семьи</h4><p>От повседневных вопросов до следующих шагов.</p></div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
            <div className="feature-text"><h4>Четкие, человеческие разговоры</h4><p>Понимайте свою заботу в удобном для вас темпе.</p></div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div className="feature-text"><h4>Более простая отправная точка</h4><p>Поговорите с ресепшн. Мы поможем вам.</p></div>
          </div>
        </Reveal>
      </section>

      <section className="services">
        <div className="container">
          <Reveal className="section-header section-header-flex">
            <div>
              <div className="tag">Забота, объединяющая</div>
              <h2>Разные потребности.<br/>Одно гостеприимное место.</h2>
            </div>
            <p>Не уверены, с чего начать? Наша команда ресепшн поможет вам найти правильную отправную точку.</p>
          </Reveal>
          
          <Reveal className="services-grid">
            <div className="service-card">
              <div className="service-card-header">
                <div className="service-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div>
              </div>
              <h3>Общая медицина</h3>
              <p>Вдумчивая первая помощь при повседневных проблемах со здоровьем, осмотры и постоянный уход.</p>
              <div className="service-footer">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Осмотры · Постоянный уход</span>
                <Link to="/services" className="btn btn-outline" style={{ padding: '8px 16px' }}>Подробнее ↗</Link>
              </div>
            </div>
            <div className="service-card">
              <div className="service-card-header">
                <div className="service-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
              </div>
              <h3>Педиатрия</h3>
              <p>Вдумчивая поддержка для маленьких людей и тех, кто их воспитывает, на каждом этапе.</p>
              <div className="service-footer">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Дети · Подростки</span>
                <Link to="/services" className="btn btn-outline" style={{ padding: '8px 16px' }}>Подробнее ↗</Link>
              </div>
            </div>
            <div className="service-card">
              <div className="service-card-header">
                <div className="service-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
              </div>
              <h3>Диагностика</h3>
              <p>Лабораторные анализы и проверки здоровья, которые помогут вам и вашему врачу понять, что делать дальше.</p>
              <div className="service-footer">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Анализы · Проверки</span>
                <Link to="/services" className="btn btn-outline" style={{ padding: '8px 16px' }}>Подробнее ↗</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: '60px 0', background: 'var(--bg-light)' }}>
        <Reveal className="container about-split">
          <div className="about-split-img">
            <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Клиника" />
          </div>
          <div className="about-split-text">
            <div className="tag">Подход Pandora</div>
            <h2>Хорошая забота начинается с того, что вас слышат.</h2>
            <p className="subtitle" style={{ marginBottom: 24 }}>Вы — больше, чем просто список симптомов. Наша идея заботы начинается с ваших вопросов, вашей повседневной жизни и того, что для вас важнее всего.</p>
            <Link to="/about" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Узнать больше о нас ↗</Link>
          </div>
        </Reveal>
      </section>

      <section className="faq" style={{ paddingTop: 80 }}>
        <div className="container faq-inner">
          <Reveal>
            <div className="tag">Перед визитом</div>
            <h2>Несколько вещей,<br/>о которых вы могли<br/>задуматься.</h2>
          </Reveal>
          <Reveal>
            <FAQList items={faqData} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}