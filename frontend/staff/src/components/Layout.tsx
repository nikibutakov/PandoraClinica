import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useAuthActions } from '@pandora/shared';
import { Drawer, Dropdown, type MenuProps } from 'antd';
import dayjs from 'dayjs';

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
    { path: '/staff/doc/record', label: 'Приём', icon: '📄' },
  ]
};

const roleLabels: Record<string, string> = {
  admin: 'Админ',
  registrar: 'Регистратор',
  doctor: 'Врач',
};

const workspaces: Record<string, string> = {
  admin: 'Кабинет админа',
  registrar: 'Кабинет регистратора',
  doctor: 'Кабинет врача',
};

/** «ИП» — инициалы из ФИО (первые буквы первых двух слов). */
function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '??';
}

export default function Layout() {
  const user = useAuth();
  const { logout } = useAuthActions();
  const location = useLocation();
  const navigate = useNavigate();

  // Состояния для меню
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(() => dayjs());

  // живые часы в топбаре
  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 30000);
    return () => clearInterval(timer);
  }, []);

  const role = user?.role ?? 'registrar';
  const currentProfile = {
    name: user?.fullName ?? '—',
    role: roleLabels[role],
    initials: user ? initials(user.fullName) : '??',
    workspace: workspaces[role],
  };
  const currentMenu = menus[role];
  const currentPath = location.pathname;
  const currentTitle = currentMenu.find(m => currentPath.includes(m.path))?.label || 'Главная';

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const toggleMenu = () => {
    if (window.innerWidth > 992) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setMobileMenuOpen(true);
    }
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: currentProfile.name,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, marginBottom: -2 }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Выйти из системы',
      danger: true,
      onClick: handleLogout,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, marginBottom: -2 }}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      ),
    },
  ];

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
    </>
  );

  return (
    <div id="app-layout" className="active">

      <aside className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`} style={{ display: window.innerWidth > 992 ? 'flex' : 'none' }}>
        {SidebarContent}
      </aside>

      <Drawer placement="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} width={240} styles={{ body: { padding: 0 } }}>
        {SidebarContent}
      </Drawer>

      <main className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className="topbar">
          <div className="flex items-center">
            <button className="menu-toggle" onClick={toggleMenu}>
              ☰
            </button>

            <div className="breadcrumbs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Главная <span style={{ margin: '0 6px' }}>/</span> <span className="current">{currentTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="time-display">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              {now.format('dd, DD MMM · HH:mm')}
            </div>

            <Dropdown menu={{ items: profileMenuItems }} trigger={['click']} placement="bottomRight">
              <div className="user-profile" style={{ padding: '4px 8px', borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer' }}>
                <div className="user-info">
                  <div className="user-name">{currentProfile.name}</div>
                  <div className="user-role">{currentProfile.role}</div>
                </div>
                <div className="avatar">{currentProfile.initials}</div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginLeft: 4 }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </Dropdown>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
