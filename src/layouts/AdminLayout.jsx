import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-surface-container flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-4xl">refresh</span></div>;
  }

  if (!user || !isAdmin) {
    // If not admin, redirect to user dashboard
    return <Navigate to="/dashboard" replace />;
  }

  const links = [
    { path: '/admin/dashboard', icon: 'dashboard', label: 'Resumen' },
    { path: '/admin/reports', icon: 'account_balance_wallet', label: 'Caja' },
    { path: '/admin/spots', icon: 'local_parking', label: 'Plazas' },
    { path: '/admin/abonados', icon: 'contact_mail', label: 'Abonados' },
    { path: '/admin/users', icon: 'group', label: 'Usuarios' },
    { path: '/admin/settings', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <div className="min-h-screen bg-surface-container flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-outline-variant/30 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant/30">
          <span className="material-symbols-outlined text-primary mr-2">shield_person</span>
          <h1 className="font-bold text-on-background tracking-tight">Admin Console</h1>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 px-2">Gestión</div>
          {links.map(link => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link 
                key={link.path} 
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant/30">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver a la App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-outline-variant/30 flex justify-between items-center px-4 md:hidden">
          <div className="flex items-center">
            <span className="material-symbols-outlined text-primary mr-2">shield_person</span>
            <h1 className="font-bold text-on-background">Admin Console</h1>
          </div>
          <Link to="/dashboard" className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Volver
          </Link>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>

        {/* Mobile Navigation */}
        <nav className="h-16 bg-white border-t border-outline-variant/30 flex items-center justify-around md:hidden pb-safe">
          {links.map(link => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link key={link.path} to={link.path} className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{link.icon}</span>
                <span className="text-[10px] font-bold mt-1">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AdminLayout;
