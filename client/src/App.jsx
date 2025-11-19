import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import PagoMensualPage from "./pages/PagoMensualPage";
import PagoExtraPage from "./pages/PagoExtraPage";
import PagoMultaPage from "./pages/PagoMultaPage.jsx";
import HistorialPage from "./pages/HistorialPage";
import HistorialGeneralPage from "./pages/HistorialGeneralPage";
import RetiroPage from "./pages/RetiroPage";
import HistorialRetiroPage from "./pages/HistorialRetiroPage";
import { AuthProvider, useAuth } from "./context/auth.jsx";
import ServerStatus from './components/ServerStatus';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, allowed = [] }) {
  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  return allowed.includes(tipoId) ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ServerStatus />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/pago-mensual" element={<PrivateRoute><PagoMensualPage /></PrivateRoute>} />
          <Route path="/pago-extra" element={<PrivateRoute><PagoExtraPage /></PrivateRoute>} />
          <Route path="/pago-multa" element={<PrivateRoute><PagoMultaPage /></PrivateRoute>} />
          <Route path="/historial" element={<PrivateRoute><HistorialPage /></PrivateRoute>} />
          <Route path="/historial-general" element={<PrivateRoute><HistorialGeneralPage /></PrivateRoute>} />
          <Route path="/retiro" element={<PrivateRoute><RoleRoute allowed={["1", "2"]}><RetiroPage /></RoleRoute></PrivateRoute>} />
          <Route path="/historial-retiro" element={<PrivateRoute><RoleRoute allowed={["1", "2"]}><HistorialRetiroPage /></RoleRoute></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;