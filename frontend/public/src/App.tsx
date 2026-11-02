/** Внешний сайт без авторизации: главная и табло /board (тёмный киоск-режим). */

import { Route, Routes } from "react-router-dom";

import Board from "./pages/Board";
import SiteHome from "./pages/SiteHome";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SiteHome />} />
      <Route path="/board" element={<Board />} />
    </Routes>
  );
}
