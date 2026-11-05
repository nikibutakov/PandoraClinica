import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login(selectedRole);
    if (selectedRole === 'admin') navigate('/staff/admin/staff');
    else if (selectedRole === 'doctor') navigate('/staff/doc/myday');
    else navigate('/staff/reg/shift');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--primary-bg)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="avatar" style={{ background: 'var(--primary)', color: 'white', borderRadius: 6, width: 28, height: 28 }}>+</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--dark)' }}>pandora</div>
          <div style={{ fontSize: '0.55rem', letterSpacing: 1, color: 'var(--text-muted)' }}>ПОЛИКЛИНИКА</div>
        </div>
      </div>

      <div style={{ background: 'var(--white)', padding: 32, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 6, color: 'var(--dark)' }}>С возвращением.</h1>
        <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.85rem' }}>Войдите в рабочее пространство.</p>

        <div className="input-group">
          <label>Выберите роль</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-body)', padding: 4, borderRadius: 6, marginBottom: 20 }}>
            {(['registrar', 'doctor', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                style={{
                  padding: 8, textAlign: 'center', fontSize: '0.85rem', fontWeight: 500,
                  color: selectedRole === r ? 'var(--primary)' : 'var(--text-muted)',
                  background: selectedRole === r ? 'var(--white)' : 'transparent',
                  borderRadius: 4, boxShadow: selectedRole === r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {r === 'registrar' ? 'Регистратор' : r === 'doctor' ? 'Врач' : 'Админ'}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Email</label>
          <input type="email" className="input-field" defaultValue="admin@pandora.clinic" />
        </div>
        <div className="input-group">
          <label>Пароль</label>
          <input type="password" className="input-field" defaultValue="............" />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: 10, fontSize: '0.9rem', marginTop: 8 }} onClick={handleLogin}>
          Войти
        </button>
      </div>
    </div>
  );
}