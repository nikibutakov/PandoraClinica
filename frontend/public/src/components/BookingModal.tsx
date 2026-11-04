import { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { useUI } from '../context/UIContext';

export default function BookingModal() {
  const { isModalOpen, closeModal } = useUI();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Сброс всех состояний при закрытии модального окна
  useEffect(() => {
    if (!isModalOpen) {
      // Небольшая задержка, чтобы анимация закрытия прошла без "мигания" контента
      const timer = setTimeout(() => {
        setPhone('');
        setError(false);
        setIsSubmitted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Функция маскирования номера
  const formatPhone = (digits: string) => {
    if (!digits) return '';
    let res = '+7 ';
    if (digits.length > 0) res += `(${digits.slice(0, 3)}`;
    if (digits.length >= 3) res += `) `;
    if (digits.length > 3) res += digits.slice(3, 6);
    if (digits.length >= 6) res += `-`;
    if (digits.length > 6) res += digits.slice(6, 8);
    if (digits.length >= 8) res += `-`;
    if (digits.length > 8) res += digits.slice(8, 10);
    return res.trim();
  };

  // Обработка ввода и удаления
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentFormatted = formatPhone(phone);

    // Оставляем только цифры
    let digits = newValue.replace(/\D/g, '');
    
    // Убираем первую 7 или 8, если пользователь вставил номер целиком
    if (digits.startsWith('7') || digits.startsWith('8')) {
      digits = digits.slice(1);
    }

    // ФИКС УДАЛЕНИЯ: если длина ввода уменьшилась, но количество цифр 
    // осталось прежним, значит пользователь стер символ маски (скобку, дефис).
    // В этом случае нам нужно принудительно удалить и последнюю цифру.
    if (newValue.length < currentFormatted.length && digits.length === phone.length) {
      digits = digits.slice(0, -1);
    }

    setPhone(digits.slice(0, 10)); // Жесткое ограничение до 10 цифр
    setError(false); // Сбрасываем ошибку при новом вводе
  };

  // Обработка отправки
  const handleSubmit = () => {
    if (phone.length !== 10) {
      setError(true);
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <Modal
      open={isModalOpen}
      onCancel={closeModal}
      footer={null}
      centered
      width={600}
      className="custom-booking-modal"
      closeIcon={<span style={{ fontSize: 24 }}>&times;</span>}
    >
      <div style={{ padding: '20px 0' }}>
        <h2 style={{ marginBottom: 8 }}>Давайте начнем с приветствия.</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Выберите, как вам удобнее связаться. Ресепшн поможет со следующим шагом.</p>

        <div className="modal-grid">
          <div className="modal-option">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Поговорить с ресепшн
            </h4>
            <p style={{ marginBottom: 12 }}>Вопросы или запись? Позвоните нашей команде.</p>
            <div className="phone-number">+7 (999) 123-45-67</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Вымышленный номер телефона</p>
          </div>
          
          <div className="modal-option highlight">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Анонимный запрос
            </h4>
            
            {isSubmitted ? (
              // ЭКРАН УСПЕШНОЙ ОТПРАВКИ
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 16 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h4 style={{ marginBottom: 8, color: 'var(--dark)' }}>Заявка готова!</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Ожидайте звонка. Наш специалист свяжется с вами в ближайшее время.</p>
              </div>
            ) : (
              // ЭКРАН ВВОДА
              <>
                <p>Оставьте номер. Имя и медицинские данные не нужны.</p>
                
                <input 
                  type="tel" 
                  placeholder="+7 (___) ___-__-__" 
                  value={formatPhone(phone)}
                  onChange={handlePhoneChange}
                  style={{ 
                    borderColor: error ? '#ff4d4f' : '#d1d5db',
                    marginBottom: error ? '8px' : '12px' // Меньше отступ, если есть ошибка
                  }}
                />
                
                {/* Сообщение об ошибке */}
                {error && (
                  <p style={{ color: '#ff4d4f', fontSize: '0.75rem', margin: '0 0 12px 0', textAlign: 'left' }}>
                    Пожалуйста, введите корректный номер телефона
                  </p>
                )}

                <button className="btn btn-primary" onClick={handleSubmit}>
                  Перезвоните мне
                </button>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                  Ваш номер используется для организации звонка. Вам не нужно указывать свое имя.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}