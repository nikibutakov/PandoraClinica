import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Auth
import Login from './pages/Login';

// Admin Pages
import AdminStaff from './pages/admin/AdminStaff';
import AdminDirs from './pages/admin/AdminDirs';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminSlots from './pages/admin/AdminSlots';
import AdminExports from './pages/admin/AdminExports';

// Registrar Pages
import RegShift from './pages/registrar/RegShift';
import RegPatients from './pages/registrar/RegPatients';
import RegBooking from './pages/registrar/RegBooking';
import RegReferrals from './pages/registrar/RegReferrals';

// Doctor Pages
import DocMyDay from './pages/doctor/DocMyDay';
import DocRecord from './pages/doctor/DocRecord';
import DocRecords from './pages/doctor/DocRecords'; // НОВЫЙ ИМПОРТ

// Защита роутов
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/staff/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/staff/login" element={<Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/staff" element={<Layout />}>
          <Route index element={<Navigate to="admin/staff" replace />} />
          
          {/* Админ */}
          <Route path="admin/staff" element={<AdminStaff />} />
          <Route path="admin/dirs" element={<AdminDirs />} />
          <Route path="admin/doctors" element={<AdminDoctors />} />
          <Route path="admin/slots" element={<AdminSlots />} />
          <Route path="admin/exports" element={<AdminExports />} />

          {/* Регистратор */}
          <Route path="reg/shift" element={<RegShift />} />
          <Route path="reg/patients" element={<RegPatients />} />
          <Route path="reg/booking" element={<RegBooking />} />
          <Route path="reg/referrals" element={<RegReferrals />} />

          {/* Врач */}
          <Route path="doc/myday" element={<DocMyDay />} />
          <Route path="doc/records" element={<DocRecords />} /> {/* НОВЫЙ МАРШРУТ */}
          <Route path="doc/record" element={<DocRecord />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/staff/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{ 
        token: { 
          colorPrimary: '#0F8B78', 
          fontFamily: "'Inter', sans-serif", 
          borderRadius: 6,
          colorText: '#374151',
        } 
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;