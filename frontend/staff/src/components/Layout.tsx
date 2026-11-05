import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from 'antd';

const menus = {
  admin: [
    { path: '/staff/admin/staff', label: 'Персонал', icon: '👨‍💼' },
    { path: '/staff/admin/dirs', label: 'Справочники', icon: '📚' },
    { path: '/staff/admin/doctors', label: 'Врачи и график', icon: '👨‍⚕️' },
    { path: '/staff/admin/slots', label: 'Слоты', icon: '⏱️' },
    { path: '/staff/admin/exports', label: 'Выгрузки', icon: '📥' },
  ],
  registrar: [
    { path: '/staff/reg/shift', label: 'Смены и кабинеты', icon: '📅' },
    { path: '/staff/reg/patients', label: 'Пациенты', icon: '👥' },
    { path: '/staff/reg/booking', label: 'Запись и талоны', icon: '📝' },
    { path: '/staff/reg/referrals', label: 'Направления и звонки', icon: '↩️' },
  ],
  doctor: [
    { path: '/staff/doc/myday', label: 'Мой день', icon: '📋' },
    { path: '/staff/doc/records', label: 'Мед. карты', icon: '📁' }, // НОВЫЙ ПУНКТ
  ]
};

const userProfiles = {
  admin: { name: 'Администратор', role: 'Админ', initials: 'АД', workspace: 'Кабинет админа' },
  registrar: { name: 'Елена Смирнова', role: 'Регистратор', initials: 'ЕС', workspace: 'Кабинет регистратора' },
  doctor: { name: 'Др. Анна Иванова', role: 'Врач', initials: 'АИ', workspace: 'Кабинет врача' },
};

export default function Layout() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentProfile = userProfiles[role];
  const currentMenu = menus[role];
  const currentPath = location.pathname;
  const currentTitle = currentMenu.find(m => currentPath.includes(m.path))?.label || 'Главная';

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const SidebarContent = (
    <>
      <div className="sidebar-header">
        <div className="avatar" style={{ background: 'var(--primary)', color: 'white', borderRadius: 6 }}>+</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--dark)' }}>pandora</div>
          <div style={{ fontSize: '0.55rem', letterSpacing: 1, color: 'var(--text-muted)' }}>ПОЛИКЛИНИКА</div>
        </div>
      </div>
      
      <div className="workspace-switcher">
        <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.6rem', borderRadius: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark)' }}>{currentProfile.workspace}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pandora · Главная</div>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-title">Разделы</div>
        {currentMenu.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-item ${currentPath.includes(item.path) ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a onClick={handleLogout} className="nav-item">
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </span>
          Выйти
        </a>
      </div>
    </>
  );

  return (
    <div id="app-layout" className="active">
      <aside className="sidebar" style={{ display: window.innerWidth > 992 ? 'flex' : 'none' }}>
        {SidebarContent}
      </aside>

      <Drawer placement="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} width={240} styles={{ body: { padding: 0 } }}>
        {SidebarContent}
      </Drawer>

      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center">
            <button className="menu-toggle" onClick={() => setMobileMenuOpen(true)} style={{ display: 'none', marginRight: 12, fontSize: '1.2rem' }}>☰</button>
            <div className="breadcrumbs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Главная <span style={{ margin: '0 6px' }}>/</span> <span className="current">{currentTitle}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="time-display">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Чт, 05 Ноя · 10:20
            </div>
            <div className="user-profile">
              <div className="user-info">
                <div className="user-name">{currentProfile.name}</div>
                <div className="user-role">{currentProfile.role}</div>
              </div>
              <div className="avatar">{currentProfile.initials}</div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}