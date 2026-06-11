import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSettings } from '../../context/SettingsContext';

const AdminDashboard = () => {
  const { currency } = useSettings();
  const [stats, setStats] = useState({ users: 0, spots: 0, reservations: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, spotsRes, reservationsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('parking_spots').select('id', { count: 'exact' }),
          supabase.from('reservations').select('total_amount', { count: 'exact' })
        ]);

        const revenue = reservationsRes.data?.reduce((acc, row) => acc + Number(row.total_amount), 0) || 0;

        setStats({
          users: usersRes.count || 0,
          spots: spotsRes.count || 0,
          reservations: reservationsRes.count || 0,
          revenue: revenue.toFixed(2)
        });
      } catch (err) {
        console.error("Error fetching admin stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="text-on-surface-variant flex items-center gap-2"><span className="material-symbols-outlined animate-spin">refresh</span> Cargando métricas...</div>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-on-background">Resumen Global</h2>
        <p className="text-on-surface-variant text-sm mt-1">Métricas en tiempo real de StacionaT.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col gap-2">
          <span className="material-symbols-outlined text-primary">group</span>
          <span className="text-3xl font-bold text-on-background">{stats.users}</span>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Usuarios Registrados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col gap-2">
          <span className="material-symbols-outlined text-tertiary">local_parking</span>
          <span className="text-3xl font-bold text-on-background">{stats.spots}</span>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Plazas Activas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col gap-2">
          <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
          <span className="text-3xl font-bold text-on-background">{stats.reservations}</span>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reservas Totales</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col gap-2">
          <span className="material-symbols-outlined text-primary">payments</span>
          <span className="text-3xl font-bold text-on-background">{currency}{stats.revenue}</span>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ingresos Acumulados</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
