import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSettings } from '../../context/SettingsContext';

const AdminSpots = () => {
  const { currency } = useSettings();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    setLoading(true);
    const { data } = await supabase.from('parking_spots').select('*').order('created_at', { ascending: false });
    if (data) setSpots(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta plaza?")) return;
    await supabase.from('parking_spots').delete().eq('id', id);
    fetchSpots();
  };

  const handleAddDemo = async () => {
    const newSpot = {
      id: `admin-spot-${Date.now()}`,
      address: `Plaza Admin ${Math.floor(Math.random() * 100)}`,
      latitude: 40.4168,
      longitude: -3.7038,
      zone_type: 'Regulada',
      base_rate_per_hour: 2.50,
      sensor_type: 'LoRaWAN',
      charger_type: 'none'
    };
    
    await supabase.from('parking_spots').insert(newSpot);
    // Also create telemetry
    await supabase.from('spot_telemetry').insert({ spot_id: newSpot.id, is_available: true });
    
    fetchSpots();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-background">Plazas de Parking</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestiona las ubicaciones y tarifas.</p>
        </div>
        <button 
          onClick={handleAddDemo}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Nueva Plaza
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-soft border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant flex justify-center"><span className="material-symbols-outlined animate-spin">refresh</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/30 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-4">Dirección</th>
                  <th className="p-4">Zona</th>
                  <th className="p-4">Tarifa ({currency}/h)</th>
                  <th className="p-4">Sensor</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {spots.map((spot) => (
                  <tr key={spot.id} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                    <td className="p-4 font-medium text-on-background">{spot.address}</td>
                    <td className="p-4 text-on-surface-variant">{spot.zone_type}</td>
                    <td className="p-4 font-bold text-primary">{currency}{spot.base_rate_per_hour}</td>
                    <td className="p-4 text-on-surface-variant">{spot.sensor_type}</td>
                    <td className="p-4 text-right">
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Editar">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(spot.id)} className="text-on-surface-variant hover:text-error transition-colors p-1" title="Eliminar">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {spots.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-on-surface-variant">No hay plazas creadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSpots;
