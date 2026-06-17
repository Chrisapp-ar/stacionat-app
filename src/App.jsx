import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import Onboarding from './components/Onboarding'
import DashboardImpacto from './components/DashboardImpacto'
import MapaDisponibilidad from './components/MapaDisponibilidad'
import ReservaTiempo from './components/ReservaTiempo'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSpots from './pages/admin/AdminSpots'
import AdminUsers from './pages/admin/AdminUsers'
import AdminSettings from './pages/admin/AdminSettings'
import AdminReports from './pages/admin/AdminReports'
import AdminAbonados from './pages/admin/AdminAbonados'
import OperatorPOS from './pages/OperatorPOS'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <HashRouter>
        <Routes>
          {/* Public / User Routes */}
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardImpacto />} />
          <Route path="/mapa" element={<MapaDisponibilidad />} />
          <Route path="/reserva" element={<ReservaTiempo />} />

          <Route path="/pos" element={<OperatorPOS />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="spots" element={<AdminSpots />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="abonados" element={<AdminAbonados />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </HashRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
