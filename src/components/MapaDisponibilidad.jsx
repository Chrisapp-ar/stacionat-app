import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const MapaDisponibilidad = () => {
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { isAdmin } = useAuth();
  const [sheetData, setSheetData] = useState(null);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    const fetchSpots = async () => {
      const { data, error } = await supabase
        .from('parking_spots')
        .select(`
          *,
          spot_telemetry(is_available)
        `);
      
      if (!error && data) {
        setSpots(data);
      }
    };
    fetchSpots();
  }, []);

  const getPositionStyles = (id) => {
    if (id.startsWith('111')) return { top: '30%', left: '45%' };
    if (id.startsWith('222')) return { top: '45%', left: '65%' };
    if (id.startsWith('333')) return { top: '55%', left: '35%' };
    if (id.startsWith('444')) return { top: '25%', left: '70%' };
    return { top: '50%', left: '50%' };
  };

  const handleOpenSheet = (id, address, statusText, statusColorClass, price, sensorType, distance) => {
    setSheetData({ id, address, statusText, statusColorClass, price, sensorType, distance });
  };

  const handleCloseSheet = () => {
    setSheetData(null);
  };

  const handleMapClick = (e) => {
    if (!e.target.closest('.map-pin') && !e.target.closest('.pointer-events-auto')) {
      handleCloseSheet();
    }
  };

  return (
    <div className="bg-background text-on-background h-screen overflow-hidden flex flex-col font-sans antialiased">
      {/* TopAppBar Mobile */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/30 md:hidden">
        <div className="flex justify-between items-center px-4 h-16 w-full">
          <button aria-label="Menu" className="text-on-surface hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex-1 flex justify-center items-center gap-2">
            <span className="material-symbols-outlined text-primary">ev_station</span>
            <h1 className="text-lg font-bold tracking-tight text-on-background">StacionaT</h1>
          </div>
          <button aria-label="User profile" className="text-on-surface w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/50">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas (Map Area) */}
      <main className="flex-1 relative w-full h-full pt-16 md:pt-0 overflow-hidden map-bg" onClick={handleMapClick}>
        
        {/* Desktop Navbar Overlay */}
        <nav className="hidden md:flex absolute top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-lg border-b border-outline-variant/30 pointer-events-auto">
          <div className="flex justify-between items-center px-6 h-16 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">ev_station</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">StacionaT</h1>
            </div>
            
            <div className="flex items-center gap-8">
              <Link to="/mapa" className="text-sm font-bold text-primary flex items-center gap-2 border-b-2 border-primary py-5">
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>map</span> Mapa
              </Link>
              <Link to="/dashboard" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">analytics</span> Resumen
              </Link>
              {isAdmin && (
                <>
                  <Link to="/pos" className="text-sm font-bold text-primary-container bg-primary px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">point_of_sale</span> Punto de Venta
                  </Link>
                  <Link to="/admin" className="text-sm font-bold text-tertiary flex items-center gap-2 px-3 py-1.5 bg-tertiary/10 rounded-full hover:bg-tertiary/20 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> Admin Console
                  </Link>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div 
                className="h-10 w-10 rounded-full bg-surface-container border border-outline-variant/50 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/dashboard')}
                title="Perfil"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">person</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Search Bar Overlay */}
        <div className="absolute top-[80px] md:top-[90px] left-0 right-0 z-30 px-4 md:px-6 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="relative bg-white rounded-2xl shadow-soft border border-outline-variant/50 flex items-center px-4 py-3">
              <span className="material-symbols-outlined text-primary mr-3">search</span>
              <input aria-label="Buscar zona" className="bg-transparent border-none text-on-background w-full focus:ring-0 focus:outline-none placeholder-on-surface-variant text-sm font-medium" placeholder="¿A dónde vas?" type="text"/>
              <button className="ml-3 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map Pins */}
        {spots.map((spot, index) => {
          const isAvailable = spot.spot_telemetry?.[0]?.is_available ?? false;
          const pos = getPositionStyles(spot.id);
          
          if (isAvailable) {
            return (
              <button key={spot.id} aria-label={`Available spot`} className="absolute map-pin z-20 group" style={pos} onClick={() => handleOpenSheet(spot.id, spot.address, 'Libre', 'tertiary', `${currency}${spot.base_rate_per_hour}/h`, spot.sensor_type, '150m')}>
                <div className="relative flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-tertiary flex items-center justify-center pulse-marker shadow-md">
                    <span className="text-tertiary font-bold text-sm">{currency}{spot.base_rate_per_hour}</span>
                  </div>
                </div>
              </button>
            );
          } else {
            return (
              <button key={spot.id} aria-label={`Occupied spot`} className="absolute map-pin z-10 group" style={pos}>
                <div className="relative flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-surface-container border border-outline flex items-center justify-center opacity-80 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">directions_car</span>
                  </div>
                </div>
              </button>
            );
          }
        })}

        {/* Floating Controls */}
        <div className="absolute right-4 bottom-[100px] md:bottom-8 flex flex-col gap-2 z-30 pointer-events-auto">
          <button className="w-12 h-12 bg-white rounded-full shadow-md border border-outline-variant/50 flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <div className="flex flex-col bg-white rounded-2xl shadow-md border border-outline-variant/50 overflow-hidden mt-2">
            <button className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/30">
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Sheet (Details) */}
      <div className={`absolute bottom-0 left-0 w-full z-50 transform ${sheetData ? 'translate-y-0' : 'translate-y-[120%]'} transition-transform duration-300 ease-in-out`}>
        <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] border-t border-outline-variant/30 px-6 py-6 pb-[100px] md:pb-6 max-w-4xl mx-auto md:rounded-3xl md:mb-6 md:border md:shadow-floating">
          
          <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto mb-6 md:hidden"></div>
          
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-tertiary/10 text-tertiary font-bold text-[10px] uppercase rounded-md">
                  {sheetData?.statusText?.toUpperCase() || 'LIBRE'}
                </span>
                <span className="text-on-surface-variant font-medium text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">route</span>
                  {sheetData?.distance || '0m'}
                </span>
              </div>
              <h2 className="text-2xl text-on-background font-bold tracking-tight">
                  {sheetData?.address || 'Dirección'}
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">Zona Azul - Estacionamiento Regulado</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="bg-surface-container flex-1 p-3 rounded-xl flex flex-col items-center justify-center border border-outline-variant/50">
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Tarifa</span>
                <span className="text-lg font-bold text-primary">{sheetData?.price || `${currency}0.00/h`}</span>
              </div>
              <div className="bg-surface-container flex-1 p-3 rounded-xl flex flex-col items-center justify-center border border-outline-variant/50">
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Cargador</span>
                <span className="text-sm font-bold text-on-background">No</span>
              </div>
            </div>
            
            <div className="w-full md:w-auto mt-2 md:mt-0 flex flex-col justify-end gap-2">
              <button 
                onClick={() => navigate(`/reserva?spot_id=${sheetData?.id}`)}
                className="w-full md:w-48 bg-primary text-white py-3 px-6 rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">navigation</span>
                Reservar
              </button>
              <button className="text-on-surface-variant font-medium text-sm w-full text-center hover:text-on-surface transition-colors" onClick={handleCloseSheet}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-outline-variant/30 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          <Link to="/mapa" className="flex flex-col items-center justify-center w-full h-full text-primary relative">
            <div className="absolute -top-3 w-12 h-1 bg-primary rounded-b-full"></div>
            <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>map</span>
            <span className="text-[10px] font-bold mt-1">Mapa</span>
          </Link>
          <a href="#" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">ev_station</span>
            <span className="text-[10px] font-semibold mt-1">Carga</span>
          </a>
          <Link to="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
            <span className="text-[10px] font-semibold mt-1">Resumen</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default MapaDisponibilidad;
