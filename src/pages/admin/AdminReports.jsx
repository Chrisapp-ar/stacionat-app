import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSettings } from '../../context/SettingsContext';

const AdminReports = () => {
  const { currency } = useSettings();
  
  // Tipos de filtro: 'day', 'month'
  const [filterType, setFilterType] = useState('day');
  
  // Por defecto, hoy
  const today = new Date();
  const defaultDate = today.toISOString().split('T')[0];
  const defaultMonth = defaultDate.substring(0, 7); // YYYY-MM
  
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  
  const [sessions, setSessions] = useState([]);
  const [groupedDays, setGroupedDays] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // KPIs
  const [metrics, setMetrics] = useState({
    ingresosVehiculares: 0,
    egresosVehiculares: 0,
    recFijos: 0,
    recMovilesAb: 0,
    recMovilesHr: 0,
    totalRecaudado: 0
  });

  useEffect(() => {
    fetchReports();
  }, [filterType, selectedDate, selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    let startDate, endDate;

    if (filterType === 'day') {
      startDate = new Date(`${selectedDate}T00:00:00.000Z`);
      endDate = new Date(`${selectedDate}T23:59:59.999Z`);
    } else {
      const [year, month] = selectedMonth.split('-');
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    }

    // Traer todas las sesiones que tengan alguna relación con este rango
    const { data, error } = await supabase
      .from('operator_sessions')
      .select('*')
      .or(`entry_time.gte.${startDate.toISOString()},exit_time.gte.${startDate.toISOString()}`)
      .order('entry_time', { ascending: false });

    if (!error && data) {
      let inVeh = 0;
      let outVeh = 0;
      let rFijo = 0;
      let rMovAb = 0;
      let rMovHr = 0;

      const validSessions = [];
      const daysMap = {}; // Para agrupar por día

      // Inicializar el mapa de días para el mes
      if (filterType === 'month') {
        const [year, month] = selectedMonth.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
          daysMap[dateStr] = {
            dateStr,
            inVeh: 0,
            outVeh: 0,
            rFijo: 0,
            rMovAb: 0,
            rMovHr: 0,
            total: 0
          };
        }
      }

      data.forEach(session => {
        const isFixed = session.spot_type === 'fixed';
        const isAbonoMobile = session.spot_type === 'mobile' && session.fixed_period;
        const isHourly = session.spot_type === 'mobile' && !session.fixed_period;

        const entryDate = session.entry_time ? new Date(session.entry_time) : null;
        const exitDate = session.exit_time ? new Date(session.exit_time) : null;

        let countedAsFlow = false;
        let countedAsFinance = false;

        // Ingresos Contables
        // Hora -> Paga al salir (status completed)
        // Abono -> Paga al registrarse (entry_time funciona como created_at aquí)
        let paymentDate = null;
        if (isHourly && session.status === 'completed' && exitDate) {
          paymentDate = exitDate;
        } else if (!isHourly && Number(session.total_amount) > 0) {
          paymentDate = entryDate;
        }

        if (paymentDate && paymentDate >= startDate && paymentDate <= endDate) {
          const amt = Number(session.total_amount);
          if (isFixed) rFijo += amt;
          else if (isAbonoMobile) rMovAb += amt;
          else if (isHourly) rMovHr += amt;
          countedAsFinance = true;
          
          if (filterType === 'month') {
            const pDayStr = paymentDate.toISOString().split('T')[0];
            if (daysMap[pDayStr]) {
              if (isFixed) daysMap[pDayStr].rFijo += amt;
              else if (isAbonoMobile) daysMap[pDayStr].rMovAb += amt;
              else if (isHourly) daysMap[pDayStr].rMovHr += amt;
              daysMap[pDayStr].total += amt;
            }
          }
        }

        // Flujo Vehicular
        if (entryDate && entryDate >= startDate && entryDate <= endDate) {
          inVeh++;
          countedAsFlow = true;
          if (filterType === 'month') {
            const eDayStr = entryDate.toISOString().split('T')[0];
            if (daysMap[eDayStr]) daysMap[eDayStr].inVeh++;
          }
        }
        if (exitDate && exitDate >= startDate && exitDate <= endDate) {
          outVeh++;
          countedAsFlow = true;
          if (filterType === 'month') {
            const xDayStr = exitDate.toISOString().split('T')[0];
            if (daysMap[xDayStr]) daysMap[xDayStr].outVeh++;
          }
        }

        if (countedAsFlow || countedAsFinance) {
          validSessions.push(session);
        }
      });

      setSessions(validSessions);
      if (filterType === 'month') {
        // Mostrar desde el día 1 hasta hoy (o el fin del mes si es un mes pasado)
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
        
        let daysArray = Object.values(daysMap);
        if (selectedMonth === currentYearMonth) {
          // Si es el mes actual, cortar en el día de hoy
          const todayDate = now.getDate();
          daysArray = daysArray.slice(0, todayDate);
        }
        // Invertir para mostrar el más reciente primero
        setGroupedDays(daysArray.reverse());
      }

      setMetrics({
        ingresosVehiculares: inVeh,
        egresosVehiculares: outVeh,
        recFijos: rFijo,
        recMovilesAb: rMovAb,
        recMovilesHr: rMovHr,
        totalRecaudado: rFijo + rMovAb + rMovHr
      });
    } else {
      console.error("Error fetching reports:", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-on-background">Inteligencia de Negocios</h2>
        <p className="text-on-surface-variant text-sm mt-1">Estadísticas de ingresos, flujo vehicular y desglose de operaciones.</p>
      </header>

      {/* Filtros */}
      <div className="bg-white p-5 rounded-3xl shadow-soft border border-outline-variant/30 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período de Análisis</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block p-3 outline-none"
          >
            <option value="day">Día Específico</option>
            <option value="month">Mes Completo</option>
          </select>
        </div>

        {filterType === 'day' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fecha</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block p-3 outline-none"
            />
          </div>
        )}
        
        {filterType === 'month' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mes</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block p-3 outline-none"
            />
          </div>
        )}

        <button 
          onClick={fetchReports}
          disabled={loading}
          className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2 ml-auto"
        >
          {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : <span className="material-symbols-outlined text-[18px]">monitoring</span>}
          Procesar Datos
        </button>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Total Financiero */}
        <div className="md:col-span-4 bg-primary p-6 rounded-3xl shadow-soft text-white relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:bg-white/20 transition-colors"></div>
          <div>
            <span className="material-symbols-outlined text-white/80 mb-2 text-3xl">account_balance_wallet</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-1">
              Recaudación Neta
            </h3>
          </div>
          <p className="text-5xl font-bold tracking-tight mt-4">{currency}{metrics.totalRecaudado.toFixed(2)}</p>
        </div>

        {/* Desglose Financiero */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col justify-center">
            <span className="material-symbols-outlined text-primary mb-2 text-2xl">lock</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Abonos Fijos
            </h3>
            <p className="text-2xl font-bold tracking-tight text-on-background">
              {currency}{metrics.recFijos.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col justify-center">
            <span className="material-symbols-outlined text-tertiary mb-2 text-2xl">card_membership</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Abonos Móviles
            </h3>
            <p className="text-2xl font-bold tracking-tight text-on-background">
              {currency}{metrics.recMovilesAb.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/30 flex flex-col justify-center">
            <span className="material-symbols-outlined text-secondary mb-2 text-2xl">schedule</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Rotación (Por Hora)
            </h3>
            <p className="text-2xl font-bold tracking-tight text-on-background">
              {currency}{metrics.recMovilesHr.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Flujo Vehicular */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Flujo de Ingresos</h3>
              <p className="text-on-surface text-xs mt-1">Vehículos que entraron al estacionamiento</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-on-background">{metrics.ingresosVehiculares}</span>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">login</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Flujo de Egresos</h3>
              <p className="text-on-surface text-xs mt-1">Vehículos que salieron del predio</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-on-background">{metrics.egresosVehiculares}</span>
              <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">logout</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tablas de Detalle */}
      <div className="bg-white rounded-3xl shadow-soft border border-outline-variant/30 overflow-hidden mt-4">
        <div className="p-5 border-b border-outline-variant/30 bg-surface-container/30">
          <h3 className="font-semibold text-lg text-on-background">
            {filterType === 'month' ? 'Resumen Diario del Mes' : 'Registro Detallado de Operaciones'}
          </h3>
          <p className="text-xs text-on-surface-variant">
            {filterType === 'month' ? 'Totales de recaudación y flujo vehicular agrupados por día.' : 'Todas las transacciones y movimientos vehiculares que coinciden con el rango seleccionado.'}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {filterType === 'month' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-5 border-b border-outline-variant/30">Fecha</th>
                  <th className="p-5 border-b border-outline-variant/30">Flujo Vehicular</th>
                  <th className="p-5 border-b border-outline-variant/30">Desglose Recaudación</th>
                  <th className="p-5 border-b border-outline-variant/30 text-right">Total Diario</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr><td colSpan="4" className="p-10 text-center"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></td></tr>
                ) : groupedDays.length === 0 ? (
                  <tr><td colSpan="4" className="p-10 text-center text-on-surface-variant font-medium">No se encontraron movimientos en este mes.</td></tr>
                ) : (
                  groupedDays.map((day, i) => (
                    <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors">
                      <td className="p-5 font-bold text-base text-on-background">
                        {new Date(`${day.dateStr}T12:00:00Z`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1 text-xs font-medium">
                          <span className="text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">login</span> {day.inVeh} Ingresos</span>
                          <span className="text-tertiary flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">logout</span> {day.outVeh} Egresos</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                          {day.rFijo > 0 && <span>Fijos: {currency}{day.rFijo.toFixed(2)}</span>}
                          {day.rMovAb > 0 && <span>Móviles (Ab): {currency}{day.rMovAb.toFixed(2)}</span>}
                          {day.rMovHr > 0 && <span>Hora: {currency}{day.rMovHr.toFixed(2)}</span>}
                          {day.total === 0 && <span>Sin Recaudación</span>}
                        </div>
                      </td>
                      <td className="p-5 text-right font-bold text-lg text-on-background">
                        {currency}{day.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-5 border-b border-outline-variant/30">Vehículo / Categoría</th>
                  <th className="p-5 border-b border-outline-variant/30">Movimiento</th>
                  <th className="p-5 border-b border-outline-variant/30">Estado de Cuenta</th>
                  <th className="p-5 border-b border-outline-variant/30 text-right">Aporte Financiero</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr><td colSpan="4" className="p-10 text-center"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan="4" className="p-10 text-center text-on-surface-variant font-medium">No se encontraron movimientos en este período.</td></tr>
                ) : (
                  sessions.map((session) => {
                    const isFixed = session.spot_type === 'fixed';
                    const isAbono = session.fixed_period != null;
                    
                    return (
                      <tr key={session.id} className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors">
                        <td className="p-5">
                          <div className="font-bold text-base text-on-background">{session.plate_number}</div>
                          <div className="flex gap-2 mt-1">
                            {isFixed ? (
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Cochera Fija</span>
                            ) : isAbono ? (
                              <span className="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Abono Móvil</span>
                            ) : (
                              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Hora / Móvil</span>
                            )}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1 text-xs text-on-surface-variant font-medium">
                            {session.entry_time && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">login</span> Entró: {new Date(session.entry_time).toLocaleString()}</span>}
                            {session.exit_time && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">logout</span> Salió: {new Date(session.exit_time).toLocaleString()}</span>}
                          </div>
                        </td>
                        <td className="p-5">
                          {session.status === 'completed' ? (
                            <span className="text-[#00875A] font-bold text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span> Completado
                            </span>
                          ) : (
                            <span className="text-on-surface font-bold text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">motion_photos_on</span> En Curso / Activo
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-right">
                          <div className="font-bold text-lg text-on-background">{currency}{Number(session.total_amount).toFixed(2)}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
