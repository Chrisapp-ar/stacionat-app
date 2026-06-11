import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OperatorPOS = () => {
  const { currency, floors, spotConfig } = useSettings();
  const { user, isAdmin, isOperator, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Shift State
  const [shift, setShift] = useState(null);
  const [checkingShift, setCheckingShift] = useState(true);
  
  // App State
  const [activeTab, setActiveTab] = useState('ingreso'); // 'ingreso' | 'salida'
  const [plate, setPlate] = useState('');
  const [location, setLocation] = useState(floors?.[0] || '');
  const [spotType, setSpotType] = useState('mobile'); // 'mobile' | 'fixed'
  const [billingMode, setBillingMode] = useState('hourly'); // 'hourly' | 'subscription'
  const [fixedPeriod, setFixedPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  const [ownerName, setOwnerName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState(spotConfig?.priceMobileStandard || 2.50);
  const [loading, setLoading] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [generatedReceipt, setGeneratedReceipt] = useState(null); // Receipt for exit
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Security & Shift Verification
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || (!isAdmin && !isOperator)) {
      navigate('/dashboard');
      return;
    }

    checkOpenShift();
  }, [user, isAdmin, isOperator, authLoading, navigate]);

  useEffect(() => {
    if (activeTab === 'salida' && shift) {
      fetchActiveSessions();
    }
  }, [activeTab, shift]);

  const checkOpenShift = async () => {
    setCheckingShift(true);
    const { data } = await supabase
      .from('pos_shifts')
      .select('*')
      .eq('user_id', user.id)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .single();
      
    if (data) {
      setShift(data);
    }
    setCheckingShift(false);
  };

  const openShift = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pos_shifts')
      .insert([{ user_id: user.id }])
      .select()
      .single();
      
    if (data && !error) {
      setShift(data);
    } else {
      alert("Error abriendo caja: " + error.message);
    }
    setLoading(false);
  };

  const closeShift = async () => {
    if (!window.confirm("¿Seguro que deseas cerrar la caja?")) return;
    setLoading(true);
    
    // Calcular el total cobrado
    const { data: sessions } = await supabase
      .from('operator_sessions')
      .select('total_amount')
      .eq('shift_id', shift.id)
      .eq('status', 'completed');
      
    const totalCollected = sessions?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
    
    const { error } = await supabase
      .from('pos_shifts')
      .update({ closed_at: new Date().toISOString(), total_collected: totalCollected })
      .eq('id', shift.id);

    if (!error) {
      alert(`Caja Cerrada Exitosamente.\nTotal Recaudado: ${currency}${totalCollected.toFixed(2)}`);
      setShift(null);
    } else {
      alert("Error cerrando caja: " + error.message);
    }
    setLoading(false);
  };

  // --- POS Logic ---
  const fetchActiveSessions = async () => {
    setLoadingSessions(true);
    const { data } = await supabase
      .from('operator_sessions')
      .select('*')
      .eq('status', 'active')
      .order('entry_time', { ascending: false });
    
    if (data) setActiveSessions(data);
    setLoadingSessions(false);
  };

  const handleEntry = async (e) => {
    e.preventDefault();
    if (!plate || !shift) return;
    
    setLoading(true);

    let finalRate = hourlyRate;
    if (spotType === 'fixed' || billingMode === 'subscription') {
      if (spotType === 'fixed') {
        if (fixedPeriod === 'monthly') finalRate = spotConfig?.priceMonthly || 5000;
        if (fixedPeriod === 'quarterly') finalRate = spotConfig?.priceQuarterly || 14000;
        if (fixedPeriod === 'semiannual') finalRate = spotConfig?.priceSemiannual || 27000;
        if (fixedPeriod === 'annual') finalRate = spotConfig?.priceAnnual || 50000;
      } else {
        if (fixedPeriod === 'monthly') finalRate = spotConfig?.priceMobileMonthly || 4000;
        if (fixedPeriod === 'quarterly') finalRate = spotConfig?.priceMobileQuarterly || 11000;
        if (fixedPeriod === 'semiannual') finalRate = spotConfig?.priceMobileSemiannual || 20000;
        if (fixedPeriod === 'annual') finalRate = spotConfig?.priceMobileAnnual || 38000;
      }
    }

    const isSubscription = spotType === 'fixed' || billingMode === 'subscription';

    if (isSubscription && (!ownerName || !carModel || !address || !phone)) {
      setLoading(false);
      alert('Por favor complete todos los datos del abonado, incluyendo el celular.');
      return;
    }

    const newSession = {
      plate_number: plate.toUpperCase(),
      location: location,
      spot_type: spotType,
      fixed_period: isSubscription ? fixedPeriod : null,
      hourly_rate: isSubscription ? 0 : finalRate,
      total_amount: isSubscription ? finalRate : 0, 
      status: 'active', 
      exit_time: null,
      shift_id: shift.id,
      created_by: user.id
    };

    const { data, error: err } = await supabase
      .from('operator_sessions')
      .insert(newSession)
      .select();

    if (err) {
      setLoading(false);
      console.error(err);
      alert("Error registrando vehículo: " + err.message);
      return;
    }

    if (isSubscription) {
      // Registrar o actualizar el abonado
      const { error: abnErr } = await supabase
        .from('abonados')
        .upsert({
          plate_number: plate.toUpperCase(),
          owner_name: ownerName,
          car_model: carModel,
          address: address,
          phone_number: phone,
          spot_type: spotType,
          fixed_period: fixedPeriod
        }, { onConflict: 'plate_number' });
        
      if (abnErr) {
        console.error("Error al guardar el abonado:", abnErr);
        alert("Advertencia: No se pudo guardar la ficha del abonado. Asegúrate de haber ejecutado el script SQL. Detalles: " + abnErr.message);
      }
    }

    setGeneratedTicket(data[0]);
    setPlate('');
    setLoading(false);
  };

  const handleExit = async (session) => {
    if (!window.confirm(`¿Confirmas la salida del vehículo ${session.plate_number}?`)) return;

    const exitTime = new Date();
    const entryTime = new Date(session.entry_time);
    
    let amount = 0;
        
    if (session.fixed_period) {
      amount = session.total_amount || 0; 
    } else {
      const diffMs = exitTime - entryTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      amount = Math.ceil(diffHours) * session.hourly_rate;
      if (amount < session.hourly_rate) amount = session.hourly_rate; 
    }

    const { data, error } = await supabase
      .from('operator_sessions')
      .update({
        status: 'completed',
        exit_time: exitTime.toISOString(),
        total_amount: amount.toFixed(2)
      })
      .eq('id', session.id)
      .select()
      .single();

    if (!error && data) {
      setGeneratedReceipt(data);
      fetchActiveSessions();
    } else {
      alert("Error procesando salida");
    }
  };

  const printDocument = () => window.print();

  const handleShareWhatsApp = (ticketData, isReceipt = false) => {
    const title = isReceipt ? "Recibo de Pago - StacionaT" : "Ticket de Ingreso - StacionaT";
    let text = `*${title}*\n\nPatente: *${ticketData.plate_number}*\nIngreso: ${new Date(ticketData.entry_time).toLocaleString()}`;
    if (isReceipt) {
      text += `\nSalida: ${new Date(ticketData.exit_time).toLocaleString()}\nTotal Pagado: ${currency}${ticketData.total_amount}`;
    } else {
      text += `\nTarifa: ${currency}${ticketData.fixed_period ? ticketData.total_amount : ticketData.hourly_rate}${!ticketData.fixed_period ? '/h' : ''}`;
    }
    if (ticketData.location) text += `\nUbicación: ${ticketData.location}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = (ticketData, isReceipt = false) => {
    const title = isReceipt ? "Recibo de Pago - StacionaT" : "Ticket de Ingreso - StacionaT";
    let body = `${title}\n\nPatente: ${ticketData.plate_number}\nIngreso: ${new Date(ticketData.entry_time).toLocaleString()}`;
    if (isReceipt) {
      body += `\nSalida: ${new Date(ticketData.exit_time).toLocaleString()}\nTotal Pagado: ${currency}${ticketData.total_amount}`;
    } else {
      body += `\nTarifa: ${currency}${ticketData.fixed_period ? ticketData.total_amount : ticketData.hourly_rate}${!ticketData.fixed_period ? '/h' : ''}`;
    }
    if (ticketData.location) body += `\nUbicación: ${ticketData.location}`;
    
    const url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  // --- Render Views ---

  if (authLoading || checkingShift) {
    return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div>;
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-soft p-8 text-center flex flex-col gap-6">
          <div className="w-20 h-20 bg-surface-container rounded-full mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">lock_open</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-on-background">Caja Cerrada</h2>
            <p className="text-on-surface-variant mt-2">Hola <b>{user.email}</b>. No tienes ningún turno activo.</p>
          </div>
          <button 
            onClick={openShift}
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 transition-all text-lg"
          >
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-primary font-bold text-sm hover:underline mt-2 flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al Resumen
          </button>
        </div>
      </div>
    );
  }

  // Calcular tarifa dinámica para mostrar en el botón
  let displayRate = hourlyRate;
  const isSubscriptionUI = spotType === 'fixed' || billingMode === 'subscription';
  if (isSubscriptionUI) {
    if (spotType === 'fixed') {
      if (fixedPeriod === 'monthly') displayRate = spotConfig?.priceMonthly || 5000;
      if (fixedPeriod === 'quarterly') displayRate = spotConfig?.priceQuarterly || 14000;
      if (fixedPeriod === 'semiannual') displayRate = spotConfig?.priceSemiannual || 27000;
      if (fixedPeriod === 'annual') displayRate = spotConfig?.priceAnnual || 50000;
    } else {
      if (fixedPeriod === 'monthly') displayRate = spotConfig?.priceMobileMonthly || 4000;
      if (fixedPeriod === 'quarterly') displayRate = spotConfig?.priceMobileQuarterly || 11000;
      if (fixedPeriod === 'semiannual') displayRate = spotConfig?.priceMobileSemiannual || 20000;
      if (fixedPeriod === 'annual') displayRate = spotConfig?.priceMobileAnnual || 38000;
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="print-hidden flex flex-wrap justify-between items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-on-background">Punto de Venta (POS)</h2>
            <p className="text-on-surface-variant text-sm mt-1">Caja Abierta: {new Date(shift.opened_at).toLocaleTimeString()}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-white border border-outline-variant text-on-background px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-surface-container transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">home</span> Dashboard
            </button>
            <button 
              onClick={closeShift}
              className="bg-error text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span> Cerrar Caja
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex max-w-md print-hidden shadow-sm border border-outline-variant/30">
          <button 
            onClick={() => { setActiveTab('ingreso'); setGeneratedTicket(null); setGeneratedReceipt(null); }}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'ingreso' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined align-middle mr-1 text-[18px]">login</span>
            Ingreso
          </button>
          <button 
            onClick={() => { setActiveTab('salida'); setGeneratedTicket(null); setGeneratedReceipt(null); }}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'salida' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined align-middle mr-1 text-[18px]">logout</span>
            Salida / Cobro
          </button>
        </div>

        {/* Tab Ingreso */}
        {activeTab === 'ingreso' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print-no-grid">
            
            <div className="bg-white p-6 rounded-3xl shadow-soft border border-outline-variant/30 print-hidden">
              <h3 className="font-semibold text-lg text-on-background border-b border-outline-variant/30 pb-3 mb-5">Registrar Vehículo</h3>
              
              <form onSubmit={handleEntry} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Patente / Matrícula</label>
                  <input 
                    type="text" 
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="Ej: AB 123 CD"
                    className="bg-surface-container border border-outline-variant text-on-background text-2xl font-bold uppercase rounded-xl focus:ring-primary focus:border-primary block w-full p-4 outline-none text-center tracking-widest"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Cochera</label>
                  <div className="bg-surface-container rounded-xl p-1 flex relative">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${spotType === 'fixed' ? 'left-[calc(50%+2px)]' : 'left-1'}`}></div>
                    <button 
                      type="button"
                      onClick={() => { setSpotType('mobile'); setBillingMode('hourly'); }}
                      className={`flex-1 py-3 relative z-10 text-xs font-bold transition-colors ${spotType === 'mobile' ? 'text-on-background' : 'text-on-surface-variant'}`}
                    >
                      Móvil
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setSpotType('fixed'); setBillingMode('subscription'); }}
                      className={`flex-1 py-3 relative z-10 text-xs font-bold transition-colors ${spotType === 'fixed' ? 'text-on-background' : 'text-on-surface-variant'}`}
                    >
                      Fija
                    </button>
                  </div>
                </div>

                {spotType === 'mobile' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Modalidad de Cobro</label>
                    <div className="bg-surface-container rounded-xl p-1 flex relative">
                      <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${billingMode === 'subscription' ? 'left-[calc(50%+2px)]' : 'left-1'}`}></div>
                      <button 
                        type="button"
                        onClick={() => setBillingMode('hourly')}
                        className={`flex-1 py-3 relative z-10 text-xs font-bold transition-colors ${billingMode === 'hourly' ? 'text-on-background' : 'text-on-surface-variant'}`}
                      >
                        Por Hora
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBillingMode('subscription')}
                        className={`flex-1 py-3 relative z-10 text-xs font-bold transition-colors ${billingMode === 'subscription' ? 'text-on-background' : 'text-on-surface-variant'}`}
                      >
                        Abono
                      </button>
                    </div>
                  </div>
                )}

                {billingMode === 'hourly' ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tarifa por Hora</label>
                    <select 
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block w-full p-4 outline-none"
                    >
                      <option value={spotConfig?.priceMobileStandard || 2.50}>Estándar - {currency}{spotConfig?.priceMobileStandard || 2.50}/h</option>
                      <option value={spotConfig?.priceMobileCovered || 3.50}>Techado - {currency}{spotConfig?.priceMobileCovered || 3.50}/h</option>
                      <option value={spotConfig?.priceMobileVan || 5.00}>Camioneta - {currency}{spotConfig?.priceMobileVan || 5.00}/h</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período de Abono ({spotType === 'fixed' ? 'Fija' : 'Móvil'})</label>
                    <select 
                      value={fixedPeriod}
                      onChange={(e) => setFixedPeriod(e.target.value)}
                      className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block w-full p-4 outline-none"
                    >
                      <option value="monthly">Mensual - {currency}{spotType === 'fixed' ? spotConfig?.priceMonthly : spotConfig?.priceMobileMonthly}</option>
                      <option value="quarterly">Trimestral - {currency}{spotType === 'fixed' ? spotConfig?.priceQuarterly : spotConfig?.priceMobileQuarterly}</option>
                      <option value="semiannual">Semestral - {currency}{spotType === 'fixed' ? spotConfig?.priceSemiannual : spotConfig?.priceMobileSemiannual}</option>
                      <option value="annual">Anual - {currency}{spotType === 'fixed' ? spotConfig?.priceAnnual : spotConfig?.priceMobileAnnual}</option>
                    </select>
                  </div>
                )}

                {floors && floors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ubicación / Piso</label>
                    <select 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-surface-container border border-outline-variant text-on-background text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block w-full p-4 outline-none"
                    >
                      {floors.map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(spotType === 'fixed' || billingMode === 'subscription') && (
                  <div className="flex flex-col gap-3 mt-2 border-t border-outline-variant/30 pt-4">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Datos del Abonado</label>
                    <input 
                      type="text" 
                      placeholder="Nombre y Apellido" 
                      value={ownerName} 
                      onChange={(e) => setOwnerName(e.target.value)} 
                      className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full outline-none focus:border-primary"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Modelo del Auto" 
                      value={carModel} 
                      onChange={(e) => setCarModel(e.target.value)} 
                      className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full outline-none focus:border-primary"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Dirección" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full outline-none focus:border-primary"
                      required
                    />
                    <input 
                      type="tel" 
                      placeholder="Número de Celular" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full outline-none focus:border-primary"
                      required
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined text-[20px]">{isSubscriptionUI ? 'payments' : 'login'}</span>}
                  {loading ? 'Procesando...' : isSubscriptionUI ? `Cobrar Abono (${currency}${displayRate})` : `Registrar Ingreso (${currency}${displayRate}/h)`}
                </button>
              </form>
            </div>

            {generatedTicket && (
              <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/50 flex flex-col items-center justify-center print-visible">
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-outline-variant w-full max-w-xs mb-6 printable-ticket">
                  <div className="text-center mb-4 border-b border-dashed border-outline-variant pb-4">
                    <h2 className="font-bold text-xl tracking-tight">StacionaT</h2>
                    <p className="text-xs text-on-surface-variant">Ticket de Ingreso</p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Patente</p>
                      <p className="text-3xl font-bold text-on-background">{generatedTicket.plate_number}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ingreso</p>
                        <p className="text-sm font-medium text-on-background">{new Date(generatedTicket.entry_time).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tarifa / Valor</p>
                        <p className="text-sm font-medium text-on-background">{currency}{generatedTicket.fixed_period ? generatedTicket.total_amount : generatedTicket.hourly_rate}{!generatedTicket.fixed_period && '/h'}</p>
                      </div>
                    </div>
                    {generatedTicket.fixed_period && (
                      <div className="mt-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Abono {generatedTicket.spot_type === 'fixed' ? 'Fijo' : 'Móvil'}</p>
                        <p className="text-sm font-bold text-primary uppercase">{generatedTicket.fixed_period}</p>
                      </div>
                    )}
                    {generatedTicket.location && (
                      <div className="mt-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ubicación</p>
                        <p className="text-sm font-bold text-on-background">{generatedTicket.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center w-full max-w-xs print-hidden">
                  <button onClick={printDocument} className="w-full bg-white text-on-background border border-outline-variant px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-surface-container active:scale-95 transition-all flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">print</span> Imprimir Ticket
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleShareWhatsApp(generatedTicket, false)} className="flex-1 bg-[#25D366] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-[#1DA851] active:scale-95 transition-all flex justify-center items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
                    </button>
                    <button onClick={() => handleShareEmail(generatedTicket, false)} className="flex-1 bg-surface-container-high text-on-background px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-outline-variant/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">mail</span> Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Salida */}
        {activeTab === 'salida' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print-no-grid">
            <div className="bg-white rounded-3xl shadow-soft border border-outline-variant/30 overflow-hidden print-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
                <h3 className="font-semibold text-on-background">Vehículos Estacionados</h3>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">{activeSessions.length} Activos</span>
              </div>
              
              {loadingSessions ? (
                <div className="flex-1 flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span></div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2">
                  {activeSessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-2">
                      <span className="material-symbols-outlined text-4xl">garage</span>
                      <p className="font-medium text-sm">No hay autos estacionados.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeSessions.map((session) => {
                        const diffMs = new Date() - new Date(session.entry_time);
                        const diffHours = Math.max(diffMs / (1000 * 60 * 60), 0.5);
                        const currTotal = (diffHours * session.hourly_rate).toFixed(2);
                        
                        return (
                          <div key={session.id} className="bg-surface-container p-4 rounded-xl flex justify-between items-center hover:bg-surface-container-high transition-colors">
                            <div>
                              <p className="font-bold text-lg text-on-background">
                                {session.plate_number} 
                                {session.location && <span className="text-xs ml-2 bg-surface-container-highest px-2 py-0.5 rounded-full">{session.location}</span>}
                                {session.fixed_period && <span className="text-[10px] ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">Abono</span>}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-1">Ingresó: {new Date(session.entry_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                            </div>
                            <button 
                              onClick={() => handleExit(session)}
                              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex flex-col items-center"
                            >
                              <span>Cobrar</span>
                              <span className="text-[11px] opacity-90">{currency}{currTotal}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {generatedReceipt && (
              <div className="bg-primary-container/20 p-6 rounded-3xl border border-primary/20 flex flex-col items-center justify-center print-visible">
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-outline-variant w-full max-w-xs mb-6 printable-ticket">
                  <div className="text-center mb-4 border-b border-dashed border-outline-variant pb-4">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2">check_circle</span>
                    <h2 className="font-bold text-xl tracking-tight">StacionaT</h2>
                    <p className="text-xs text-on-surface-variant font-medium">Recibo de Pago</p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="text-center bg-surface-container py-3 rounded-lg">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Abonado</p>
                      <p className="text-3xl font-bold text-on-background">{currency}{generatedReceipt.total_amount}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mt-2">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Patente</p>
                        <p className="font-bold text-on-background">{generatedReceipt.plate_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Tarifa</p>
                        <p className="font-medium text-on-background">{currency}{generatedReceipt.hourly_rate}/h</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Entrada</p>
                        <p className="font-medium text-on-background">{new Date(generatedReceipt.entry_time).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Salida</p>
                        <p className="font-medium text-on-background">{new Date(generatedReceipt.exit_time).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {generatedReceipt.location && (
                      <div className="text-sm">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Ubicación</p>
                        <p className="font-medium text-on-background">{generatedReceipt.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-dashed border-outline-variant text-center">
                    <p className="text-[10px] text-on-surface-variant">¡Gracias por su visita!</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center w-full max-w-xs print-hidden">
                  <button onClick={printDocument} className="w-full bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span> Imprimir Recibo
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleShareWhatsApp(generatedReceipt, true)} className="flex-1 bg-[#25D366] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-[#1DA851] active:scale-95 transition-all flex justify-center items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
                    </button>
                    <button onClick={() => handleShareEmail(generatedReceipt, true)} className="flex-1 bg-surface-container-high text-on-background px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-outline-variant/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">mail</span> Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print-visible, .print-visible * { visibility: visible; }
            .print-visible { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; background: white !important; }
            .print-hidden { display: none !important; }
            .printable-ticket { width: 300px; margin: 0 auto; border: none !important; box-shadow: none !important; }
          }
        `}} />
      </div>
    </div>
  );
};

export default OperatorPOS;
