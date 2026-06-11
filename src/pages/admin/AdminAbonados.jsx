import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const AdminAbonados = () => {
  const { user } = useAuth();
  const { spotConfig, currency } = useSettings();
  const [abonados, setAbonados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Entre el 1 y el 10
  const isReportPeriod = currentDay >= 1 && currentDay <= 10;

  useEffect(() => {
    fetchAbonados();
  }, []);

  const fetchAbonados = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('abonados')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setAbonados(data);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  // Filtrar por patente o nombre
  const filteredAbonados = abonados.filter(ab => 
    (ab.plate_number || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (ab.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lógica de morosos (Pendientes de pago)
  // Alguien es moroso si su last_payment_date es anterior al mes actual (para simplificar, asumiremos cobro mensual).
  // Si tiene abono trimestral, la lógica debería ser más compleja, pero para MVP, si no pagó en el mes actual (o dentro del periodo de cobertura), lo marcamos.
  // Vamos a usar una regla básica: Si su last_payment_date fue antes del 1 del mes actual.
  const getIsPending = (lastPaymentDate) => {
    if (!lastPaymentDate) return true;
    const lastPayment = new Date(lastPaymentDate);
    // Verificar si el último pago fue antes del mes/año actual
    if (lastPayment.getFullYear() < currentYear) return true;
    if (lastPayment.getFullYear() === currentYear && lastPayment.getMonth() < currentMonth) return true;
    return false;
  };

  const pendingAbonados = abonados.filter(ab => getIsPending(ab.last_payment_date));

  const getAbonoPrice = (spotType, fixedPeriod) => {
    if (!spotConfig) return 0;
    if (spotType === 'fixed') {
      if (fixedPeriod === 'monthly') return spotConfig.priceMonthly || 5000;
      if (fixedPeriod === 'quarterly') return spotConfig.priceQuarterly || 14000;
      if (fixedPeriod === 'semiannual') return spotConfig.priceSemiannual || 27000;
      if (fixedPeriod === 'annual') return spotConfig.priceAnnual || 50000;
    } else {
      if (fixedPeriod === 'monthly') return spotConfig.priceMobileMonthly || 4000;
      if (fixedPeriod === 'quarterly') return spotConfig.priceMobileQuarterly || 11000;
      if (fixedPeriod === 'semiannual') return spotConfig.priceMobileSemiannual || 20000;
      if (fixedPeriod === 'annual') return spotConfig.priceMobileAnnual || 38000;
    }
    return 0;
  };

  const handleMarkAsPaid = async (abonadoId) => {
    const ab = abonados.find(a => a.id === abonadoId);
    if (!ab) return;

    // Optimistic UI update
    setAbonados(prev => prev.map(a => 
      a.id === abonadoId ? { ...a, last_payment_date: new Date().toISOString() } : a
    ));

    const { error } = await supabase
      .from('abonados')
      .update({ last_payment_date: new Date().toISOString() })
      .eq('id', abonadoId);
      
    if (error) {
      console.error("Error al registrar el pago:", error);
      alert("Hubo un error al registrar el pago. Intenta de nuevo.");
      fetchAbonados(); // Revert optimistic update
      return;
    }

    // Insertar registro contable en operator_sessions para reportes financieros
    await supabase.from('operator_sessions').insert({
      plate_number: ab.plate_number,
      spot_type: ab.spot_type,
      fixed_period: ab.fixed_period,
      hourly_rate: 0,
      total_amount: getAbonoPrice(ab.spot_type, ab.fixed_period),
      status: 'active',
      created_by: user.id
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-on-background">Gestión de Abonados</h2>
          <p className="text-on-surface-variant text-sm mt-1">Busca clientes y revisa el estado de pagos</p>
        </div>
      </div>

      {isReportPeriod && pendingAbonados.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-error-container border border-error/20 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-error text-3xl">warning</span>
            <div>
              <h3 className="font-bold text-on-error-container text-lg">Reporte de Morosidad</h3>
              <p className="text-sm text-on-error-container/80">Estamos entre el día 1 y 10 del mes. Los siguientes vehículos están pendientes de pago.</p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-error/10 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-error/5 text-on-surface text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-error/10">Patente</th>
                  <th className="p-4 font-bold border-b border-error/10">Nombre</th>
                  <th className="p-4 font-bold border-b border-error/10">Tipo</th>
                  <th className="p-4 font-bold border-b border-error/10">Último Pago</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingAbonados.map(ab => (
                  <tr key={ab.id} className="border-b border-error/5 last:border-0 hover:bg-error/5 transition-colors">
                    <td className="p-4 font-bold text-error">{ab.plate_number}</td>
                    <td className="p-4 text-on-background font-medium">{ab.owner_name}</td>
                    <td className="p-4 text-on-surface-variant">
                      <span className="bg-surface-container px-2 py-1 rounded-md text-xs font-bold uppercase">
                        {ab.spot_type} - {ab.fixed_period}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      <div className="flex items-center gap-3">
                        {ab.last_payment_date ? new Date(ab.last_payment_date).toLocaleDateString() : 'Nunca'}
                        <button 
                          onClick={() => handleMarkAsPaid(ab.id)}
                          className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          Pagar ({currency}{getAbonoPrice(ab.spot_type, ab.fixed_period)})
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-3xl shadow-soft border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 bg-surface-container/30">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Buscar por patente o nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant/50 rounded-2xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
          </div>
        ) : filteredAbonados.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">directions_car</span>
            <p>No se encontraron abonados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/30 text-on-surface text-xs uppercase tracking-wider">
                  <th className="p-5 font-bold border-b border-outline-variant/30">Patente / Vehículo</th>
                  <th className="p-5 font-bold border-b border-outline-variant/30">Cliente</th>
                  <th className="p-5 font-bold border-b border-outline-variant/30">Abono</th>
                  <th className="p-5 font-bold border-b border-outline-variant/30">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredAbonados.map(ab => {
                  const isPending = getIsPending(ab.last_payment_date);
                  
                  return (
                    <tr key={ab.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/30 transition-colors">
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-background text-base">{ab.plate_number}</span>
                          <span className="text-xs text-on-surface-variant mt-1">{ab.car_model}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-background">{ab.owner_name}</span>
                          <span className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">location_on</span> {ab.address}
                          </span>
                          {ab.phone_number && (
                            <span className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">call</span> {ab.phone_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ab.spot_type === 'fixed' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                            {ab.spot_type === 'fixed' ? 'Fija' : 'Móvil'}
                          </span>
                          <span className="text-xs font-medium text-on-surface">{ab.fixed_period}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        {isPending ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-error">
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                              <span className="text-xs font-bold uppercase tracking-wider">Pendiente</span>
                            </div>
                            <button 
                              onClick={() => handleMarkAsPaid(ab.id)}
                              className="bg-primary text-white px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">payments</span> Pagar ({currency}{getAbonoPrice(ab.spot_type, ab.fixed_period)})
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#00875A]">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Al Día</span>
                          </div>
                        )}
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Últ. Pago: {ab.last_payment_date ? new Date(ab.last_payment_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAbonados;
