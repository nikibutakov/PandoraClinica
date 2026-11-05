import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import { UIProvider } from "./context/UIContext";

import Header from "./components/Header";
import SideMenu from "./components/SideMenu";
import Footer from "./components/Footer";
import BookingModal from "./components/BookingModal";

import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";

function App() {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: "#0F8B78",
          fontFamily: "'Inter', sans-serif",
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <UIProvider>
          <Header />
          <SideMenu />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <BookingModal />
        </UIProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
