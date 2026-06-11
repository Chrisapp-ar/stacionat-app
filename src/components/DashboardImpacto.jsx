import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const DashboardImpacto = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isOperator, loading: authLoading } = useAuth();
  const { currency, spotConfig } = useSettings();
  
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]); // Active sessions for list
  const [recentSessions, setRecentSessions] = useState([]); // Last 7 days
  const [chartData, setChartData] = useState({ co2: [], revenue: [] }); // Arrays of 7 elements
  const [co2Today, setCo2Today] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [impactView, setImpactView] = useState('co2'); // 'co2' or 'revenue'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Impresión de Recibo
  useEffect(() => {
    if (selectedReceipt) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  }, [selectedReceipt]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/onboarding');
      return;
    }

    const fetchData = async () => {
      // Fetch Profile stats
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) setProfile(profileData);

      // Fetch active sessions based on role
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(startOfToday.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);

      if (isAdmin || isOperator) {
        const { data: posData } = await supabase
          .from('operator_sessions')
          .select('*')
          .eq('status', 'active');
        if (posData) setSessions(posData);

        const { data: recentData } = await supabase
          .from('operator_sessions')
          .select('*')
          .gte('entry_time', sevenDaysAgo.toISOString());
        if (recentData) setRecentSessions(recentData);

        const { data: pastData } = await supabase
          .from('operator_sessions')
          .select('*')
          .eq('status', 'completed')
          .order('exit_time', { ascending: false })
          .limit(10);
        if (pastData) setPastSessions(pastData);
        
      } else {
        const { data: sessionData } = await supabase
          .from('reservations')
          .select(`*, parking_spots (*)`)
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (sessionData) setSessions(sessionData);

        const { data: recentData } = await supabase
          .from('reservations')
          .select('*')
          .eq('user_id', user.id)
          .gte('entry_time', sevenDaysAgo.toISOString());
        if (recentData) setRecentSessions(recentData);

        const { data: pastData } = await supabase
          .from('reservations')
          .select(`*, parking_spots (*)`)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('exit_time', { ascending: false })
          .limit(10);
        if (pastData) setPastSessions(pastData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, isAdmin, isOperator, authLoading, navigate]);

  useEffect(() => {
    const calculateStats = () => {
      const CO2_PER_HOUR = 2.5; // kg de CO2 evitados por hora de estacionamiento
      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);

      // Initialize array for last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - i);
        days.push({
          dateStr: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
          dateObj: d,
          co2: 0,
          revenue: 0
        });
      }

      recentSessions.forEach(session => {
        const entryTime = new Date(session.entry_time);
        let exitTime = now;
        let rev = 0;
        
        if (session.status === 'completed' && session.exit_time) {
          exitTime = new Date(session.exit_time);
          rev = Number(session.total_amount) || 0;
        }

        const diffHours = (exitTime - entryTime) / (1000 * 60 * 60);
        const co2Evitados = diffHours > 0 ? diffHours * CO2_PER_HOUR : 0;

        // Determine which day index this session belongs to
        // Base it on entry_time
        const entryDateOnly = new Date(entryTime);
        entryDateOnly.setHours(0,0,0,0);

        const diffTime = Math.abs(startOfToday - entryDateOnly);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const dayIndex = 6 - diffDays;

        if (dayIndex >= 0 && dayIndex <= 6) {
          days[dayIndex].co2 += co2Evitados;
          days[dayIndex].revenue += rev;
        }
      });
      
      setChartData({
        co2: days,
        revenue: days
      });

      setCo2Today(days[6].co2.toFixed(1));
      setRevenueToday(days[6].revenue.toFixed(2));
    };

    calculateStats();
    const interval = setInterval(calculateStats, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [recentSessions]);

  // Cálculos de disponibilidad
  const occupiedFixed = sessions.filter(s => s.spot_type === 'fixed').length;
  const occupiedMobile = sessions.filter(s => s.spot_type === 'mobile').length;
  const availableFixed = Math.max(0, (spotConfig?.qtyFixed || 0) - occupiedFixed);
  const availableMobile = Math.max(0, (spotConfig?.qtyMobile || 0) - occupiedMobile);
  const totalAvailable = availableFixed + availableMobile;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen friendly-gradient flex items-center justify-center text-primary">
        <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
      </div>
    );
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <div className="min-h-screen bg-surface-container-low text-on-background pb-32">
        {/* Top Navbar */}
      <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-outline-variant/30">
        <div className="flex justify-between items-center px-6 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">ev_station</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">StacionaT</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/mapa" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">map</span> Mapa
            </Link>
            <Link to="/dashboard" className="text-sm font-bold text-primary flex items-center gap-2 border-b-2 border-primary py-5">
              <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>analytics</span> Resumen
            </Link>
            {(isAdmin || isOperator) && (
              <Link to="/pos" className="text-sm font-bold text-primary-container bg-primary px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">point_of_sale</span> Punto de Venta
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-bold text-tertiary flex items-center gap-2 px-3 py-1.5 bg-tertiary/10 rounded-full hover:bg-tertiary/20 transition-colors">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> Admin Console
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold">{user.email.split('@')[0]}</p>
              <p className="text-xs text-on-surface-variant">Personal</p>
            </div>
            <div 
              className="h-10 w-10 rounded-full bg-surface-container border border-outline-variant/50 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={async () => { await supabase.auth.signOut(); navigate('/onboarding'); }}
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">logout</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Hola, {user.email.split('@')[0]} 👋</h2>
            <p className="text-on-surface-variant mt-1">Aquí tienes el resumen de tu actividad e impacto.</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">schedule</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-on-background leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </header>

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Dynamic Widget (CO2 / Revenue) */}
          <motion.div variants={item} className="md:col-span-8 bg-white rounded-3xl p-6 shadow-soft border border-outline-variant/30 relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-tertiary/20 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="bg-surface-container rounded-xl p-1 flex shadow-sm">
                <button 
                  onClick={() => setImpactView('co2')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${impactView === 'co2' ? 'bg-tertiary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">nature</span> Impacto Ambiental
                </button>
                <button 
                  onClick={() => setImpactView('revenue')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${impactView === 'revenue' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">payments</span> Pagos Recibidos
                </button>
              </div>
              
              <div className="bg-tertiary-container/50 px-3 py-1 rounded-full text-tertiary font-medium text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
              </div>
            </div>
            
            {impactView === 'co2' ? (
              <>
                <div className="flex items-end gap-3 relative z-10">
                  <span className="text-5xl font-bold tracking-tight text-on-background">{co2Today}</span>
                  <span className="text-on-surface-variant font-medium mb-1">kg de CO₂ evitados hoy</span>
                </div>
                
                <div className="mt-8 h-24 flex items-end gap-3 w-full relative">
                  {chartData.co2.slice(0, 6).map((day, i) => {
                    const maxCo2 = Math.max(...chartData.co2.map(d => d.co2), 10);
                    const h = day.co2 / maxCo2;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                        <div className="absolute -top-6 opacity-100 md:opacity-0 md:group-hover/bar:opacity-100 transition-opacity bg-tertiary text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-20 shadow-sm">
                          {day.co2.toFixed(1)} kg
                        </div>
                        <div className="w-full bg-surface-container rounded-t-md hover:bg-tertiary/30 transition-colors" style={{ height: `${Math.max(h * 100, 5)}%` }}></div>
                        <span className="text-[9px] text-on-surface-variant mt-1 font-medium">{day.dateStr}</span>
                      </div>
                    );
                  })}
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: `${Math.max((chartData.co2[6]?.co2 / Math.max(...chartData.co2.map(d => d.co2), 10)) * 100, 5)}%` }} 
                    transition={{ duration: 1, delay: 0.5 }} 
                    className="flex-1 bg-tertiary rounded-t-md relative flex justify-center mt-auto"
                  >
                    <div className="absolute -top-8 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-tertiary uppercase whitespace-nowrap">{co2Today} kg</span>
                      <span className="text-[10px] font-bold text-tertiary uppercase">Hoy</span>
                    </div>
                  </motion.div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end gap-3 relative z-10">
                  <span className="text-5xl font-bold tracking-tight text-on-background">{currency}{revenueToday}</span>
                  <span className="text-on-surface-variant font-medium mb-1">cobrados hoy</span>
                </div>
                
                <div className="mt-8 h-24 flex items-end gap-3 w-full relative">
                  {chartData.revenue.slice(0, 6).map((day, i) => {
                    const maxRev = Math.max(...chartData.revenue.map(d => d.revenue), 100);
                    const h = day.revenue / maxRev;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                        <div className="absolute -top-6 opacity-100 md:opacity-0 md:group-hover/bar:opacity-100 transition-opacity bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-20 shadow-sm">
                          {currency}{day.revenue.toFixed(0)}
                        </div>
                        <div className="w-full bg-surface-container rounded-t-md hover:bg-primary/30 transition-colors" style={{ height: `${Math.max(h * 100, 5)}%` }}></div>
                        <span className="text-[9px] text-on-surface-variant mt-1 font-medium">{day.dateStr}</span>
                      </div>
                    );
                  })}
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: `${Math.max((chartData.revenue[6]?.revenue / Math.max(...chartData.revenue.map(d => d.revenue), 100)) * 100, 5)}%` }} 
                    transition={{ duration: 1, delay: 0.5 }} 
                    className="flex-1 bg-primary rounded-t-md relative flex justify-center mt-auto"
                  >
                    <div className="absolute -top-8 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-primary uppercase whitespace-nowrap">{currency}{revenueToday}</span>
                      <span className="text-[10px] font-bold text-primary uppercase">Hoy</span>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>

          {/* Disponibilidad de Plazas */}
          <motion.div variants={item} className="md:col-span-4 bg-white rounded-3xl p-6 shadow-soft border border-outline-variant/30 flex flex-col justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-on-surface-variant uppercase text-xs tracking-wider mb-6">
              <span className="material-symbols-outlined text-primary text-[18px]">local_parking</span> Plazas Disponibles
            </h3>
            
            <div>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-bold tracking-tight text-on-background">{totalAvailable}</span>
                <span className="text-on-surface-variant font-medium mb-1">libres ahora</span>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Cocheras Fijas</p>
                      <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">{occupiedFixed} ocupadas</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-on-background">{availableFixed}</span>
                </div>

                <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[20px]">schedule</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">Cocheras Móviles</p>
                      <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">{occupiedMobile} ocupadas</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-on-background">{availableMobile}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Concurrent EV Management */}
          <motion.div variants={item} className="md:col-span-7 bg-white rounded-3xl p-6 shadow-soft border border-outline-variant/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold flex items-center gap-2 text-on-surface-variant uppercase text-xs tracking-wider">
                <span className="material-symbols-outlined text-[18px]">directions_car</span> {(isAdmin || isOperator) ? 'Autos Activos' : 'Sesiones Activas'}
              </h3>
              <span className="bg-primary-container text-on-primary-container text-[10px] font-bold px-3 py-1 rounded-full">{sessions.length} {(isAdmin || isOperator) ? 'Vehículos' : 'Plazas'}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {sessions.length === 0 ? (
                <div className="text-center py-10 bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">directions_car</span>
                  <p className="text-sm font-medium text-on-surface-variant">{(isAdmin || isOperator) ? 'No hay autos en el estacionamiento.' : 'No tienes reservas activas.'}</p>
                  {!(isAdmin || isOperator) && <Link to="/mapa" className="text-primary hover:underline text-sm font-bold mt-2 inline-block">Reservar ahora</Link>}
                </div>
              ) : (
                sessions.map((session, i) => (
                  <motion.div key={session.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="bg-surface-container rounded-2xl p-4 flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white text-primary rounded-xl flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined">local_parking</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-background truncate max-w-[180px]">{(isAdmin || isOperator) ? session.plate_number : session.parking_spots?.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">{(isAdmin || isOperator) ? 'Estacionado' : 'En curso'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {(isAdmin || isOperator) ? (
                        <>
                          <p className="font-bold text-sm text-on-background">{new Date(session.entry_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Ingreso</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-lg text-on-background">{currency} {session.total_amount}</p>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Pagado</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Billing / Receipts */}
          <motion.div variants={item} className="md:col-span-5 bg-white rounded-3xl p-6 shadow-soft border border-outline-variant/30 flex flex-col max-h-[400px]">
            <h3 className="font-semibold flex items-center gap-2 text-on-surface-variant uppercase text-xs tracking-wider mb-4 shrink-0">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span> Historial de Recibos
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
              {pastSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-medium text-on-surface-variant">No hay recibos recientes.</p>
                </div>
              ) : (
                pastSessions.map(session => (
                  <div key={session.id} className="bg-surface-container rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors border border-outline-variant/30">
                    <div>
                      <p className="font-bold text-sm text-on-background">{(isAdmin || isOperator) ? session.plate_number : session.parking_spots?.address}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{new Date(session.exit_time).toLocaleDateString()} - {new Date(session.exit_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12:true})}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-sm text-primary">{currency}{session.total_amount}</p>
                      <button 
                        onClick={() => setSelectedReceipt(session)}
                        className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                        title="Descargar Recibo"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-outline-variant/30 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          <Link to="/mapa" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">map</span>
            <span className="text-[10px] font-semibold mt-1">Mapa</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-primary relative">
            <div className="absolute -top-3 w-12 h-1 bg-primary rounded-b-full"></div>
            <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>analytics</span>
            <span className="text-[10px] font-bold mt-1">Resumen</span>
          </Link>
          {(isAdmin || isOperator) ? (
            <Link to="/pos" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
              <span className="text-[10px] font-semibold mt-1">POS</span>
            </Link>
          ) : (
            <a href="#" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[24px]">ev_station</span>
              <span className="text-[10px] font-semibold mt-1">Carga</span>
            </a>
          )}
          {isAdmin && (
            <Link to="/admin" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
              <span className="text-[10px] font-semibold mt-1">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>

      {/* Plantilla de Impresión de Recibo */}
      {selectedReceipt && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black" style={{ width: '80mm', margin: '0 auto' }}>
          <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
            <h1 className="text-2xl font-bold font-mono uppercase tracking-widest">StacionaT</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Ticket de Pago / Recibo</p>
          </div>
          
          <div className="space-y-4 font-mono text-sm">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold">{selectedReceipt.plate_number || 'N/A'}</span>
              <span className="text-xs mt-1 text-gray-500 uppercase tracking-widest">Vehículo / Patente</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-b border-dashed border-gray-400 py-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Ingreso</p>
                <p className="font-medium">{new Date(selectedReceipt.entry_time).toLocaleTimeString()}</p>
                <p className="text-[10px]">{new Date(selectedReceipt.entry_time).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Salida</p>
                <p className="font-medium">{new Date(selectedReceipt.exit_time).toLocaleTimeString()}</p>
                <p className="text-[10px]">{new Date(selectedReceipt.exit_time).toLocaleDateString()}</p>
              </div>
            </div>
            
            {selectedReceipt.location && (
              <div className="border-b border-dashed border-gray-400 pb-4">
                <p className="text-[10px] text-gray-500 uppercase">Ubicación</p>
                <p className="font-medium">{selectedReceipt.location}</p>
              </div>
            )}

            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-bold uppercase">Total Pagado:</span>
              <span className="text-2xl font-bold">{currency}{selectedReceipt.total_amount}</span>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-dashed border-gray-400 text-center">
            <p className="text-xs font-mono">¡Gracias por su visita!</p>
            <p className="text-[10px] font-mono text-gray-500 mt-1">ID: {selectedReceipt.id.split('-')[0]}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardImpacto;
