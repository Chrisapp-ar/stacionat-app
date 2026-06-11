import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion } from 'framer-motion';

const ReservaTiempo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spotId = searchParams.get('spot_id');
  const { user } = useAuth();
  const { currency } = useSettings();
  
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [hours, setHours] = useState(1.5); // Fixed for MVP

  useEffect(() => {
    if (!spotId) {
      navigate('/mapa');
      return;
    }

    const fetchSpot = async () => {
      const { data, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', spotId)
        .single();
      
      if (data) setSpot(data);
      setLoading(false);
    };

    fetchSpot();
  }, [spotId, navigate]);

  const handleReserve = async () => {
    if (!user || !spot) {
      alert("Debes iniciar sesión primero");
      navigate('/onboarding');
      return;
    }
    
    setReserving(true);
    const totalAmount = spot.base_rate_per_hour * hours;
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    const { error: resError } = await supabase.from('reservations').insert({
      user_id: user.id,
      spot_id: spot.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_amount: totalAmount,
      payment_method: 'Apple Pay',
      status: 'active'
    });

    if (!resError) {
      await supabase.from('spot_telemetry')
        .update({ is_available: false, last_updated: new Date().toISOString() })
        .eq('spot_id', spot.id);
        
      navigate('/dashboard');
    } else {
      console.error(resError);
      alert("Error al reservar");
      setReserving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-surface-container-low flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-4xl">refresh</span></div>;

  const price = (spot?.base_rate_per_hour * hours).toFixed(2);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-surface-container-low text-on-background min-h-screen flex flex-col relative overflow-x-hidden font-sans pb-32"
    >
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-outline-variant/30 flex justify-between items-center px-4 h-16 max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-on-background">
            Confirmar Reserva
        </h1>
        <div className="w-10 h-10"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-grow pt-6 px-4 max-w-md mx-auto w-full flex flex-col gap-6">
        
        {spot?.zone_type === 'ZBE' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-error-container/50 border border-error-container rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <span className="material-symbols-outlined text-on-error-container mt-0.5">warning</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-error-container">Zona ZBE</span>
              <p className="text-sm text-on-error-container font-medium mt-0.5 leading-tight">Estancia máxima: 2 horas por regulación municipal.</p>
            </div>
          </motion.div>
        )}

        <section className="flex flex-col items-center justify-center py-6">
          <div className="flex flex-col items-center text-center">
            <motion.span initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-6xl font-bold tracking-tight text-on-background">1h 30m</motion.span>
            <motion.span initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-xl font-bold text-primary mt-1">{currency} {price}</motion.span>
          </div>

          <div className="w-[280px] h-[140px] relative overflow-hidden mt-8">
            <svg className="w-full h-full" viewBox="0 0 200 120">
              <path className="stroke-outline-variant" d="M 10 110 A 90 90 0 0 1 190 110" fill="none" strokeLinecap="round" strokeWidth="12"></path>
              <path className="stroke-primary" d="M 10 110 A 90 90 0 0 1 155 35" fill="none" strokeLinecap="round" strokeWidth="12"></path>
            </svg>
            <div className="absolute top-[28px] right-[38px] w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md z-20 border-4 border-primary">
            </div>
          </div>
        </section>

        <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white border border-outline-variant/50 rounded-3xl p-5 shadow-soft flex flex-col gap-4 mt-auto">
          
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant tracking-wider">Detalles de la plaza</span>
            <div className="bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
              <span className="text-[10px] font-bold text-primary uppercase">{spot?.charger_type === 'none' ? 'Estándar' : 'Con Cargador'}</span>
            </div>
          </div>

          <div className="flex justify-between items-end pt-1">
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant mb-1 font-medium">Ubicación</span>
              <span className="text-sm font-bold text-on-background truncate max-w-[150px]">{spot?.address}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs text-on-surface-variant mb-1 font-medium">Tarifa Base</span>
              <span className="text-base font-bold text-on-background">{currency}{spot?.base_rate_per_hour} <span className="text-xs text-on-surface-variant font-medium">/h</span></span>
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-outline-variant/30 flex items-center gap-3 bg-surface-container rounded-xl p-3 hover:bg-outline-variant/20 transition-colors cursor-pointer border border-transparent">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-outline-variant/50 shadow-sm">
              <span className="material-symbols-outlined text-on-background">account_balance_wallet</span>
            </div>
            <div className="flex flex-col flex-grow">
              <span className="text-sm font-bold text-on-background">Apple Pay</span>
              <span className="text-xs text-on-surface-variant font-medium">Termina en •••• 4092</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </div>
        </motion.section>
      </main>

      <div className="fixed bottom-0 left-0 w-full px-4 pt-4 pb-8 bg-white border-t border-outline-variant/30 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] z-40">
        <button 
          onClick={handleReserve}
          disabled={reserving}
          className="w-full max-w-md mx-auto h-14 bg-primary text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {reserving ? (
            <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            <>
              <span className="material-symbols-outlined">lock</span>
              Confirmar Reserva
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ReservaTiempo;
