import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSettings } from '../../context/SettingsContext';

const AdminSettings = () => {
  const { currency, floors, spotConfig, refreshSettings } = useSettings();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [floorsInput, setFloorsInput] = useState(floors?.join(', ') || '');
  const [config, setConfig] = useState(spotConfig || {
    qtyFixed: 20, qtyMobile: 50, qtyTotal: 70,
    priceMonthly: 5000, priceQuarterly: 14000, priceSemiannual: 27000, priceAnnual: 50000,
    priceMobileStandard: 2.50, priceMobileCovered: 3.50, priceMobileVan: 5.00,
    priceMobileMonthly: 4000, priceMobileQuarterly: 11000, priceMobileSemiannual: 20000, priceMobileAnnual: 38000
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Sincronizar el estado local cuando el contexto cambie inicialmente
  useEffect(() => {
    setSelectedCurrency(currency);
    setFloorsInput(floors?.join(', ') || '');
    if (spotConfig) setConfig(spotConfig);
  }, [currency, floors, spotConfig]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    // Guardar Moneda
    const { error: err1 } = await supabase
      .from('app_settings')
      .upsert({ key: 'currency', value: selectedCurrency });

    // Guardar Pisos
    const { error: err2 } = await supabase
      .from('app_settings')
      .upsert({ key: 'floors', value: floorsInput });

    // Guardar Cocheras
    const settingsToSave = [
      { key: 'qty_fixed_spots', value: config.qtyFixed },
      { key: 'qty_mobile_spots', value: config.qtyMobile },
      { key: 'qty_total_cars', value: config.qtyTotal },
      { key: 'price_fixed_monthly', value: config.priceMonthly },
      { key: 'price_fixed_quarterly', value: config.priceQuarterly },
      { key: 'price_fixed_semiannual', value: config.priceSemiannual },
      { key: 'price_fixed_annual', value: config.priceAnnual },
      { key: 'price_mobile_standard', value: config.priceMobileStandard },
      { key: 'price_mobile_covered', value: config.priceMobileCovered },
      { key: 'price_mobile_van', value: config.priceMobileVan },
      { key: 'price_mobile_monthly', value: config.priceMobileMonthly },
      { key: 'price_mobile_quarterly', value: config.priceMobileQuarterly },
      { key: 'price_mobile_semiannual', value: config.priceMobileSemiannual },
      { key: 'price_mobile_annual', value: config.priceMobileAnnual },
    ];

    const { error: err3 } = await supabase
      .from('app_settings')
      .upsert(settingsToSave);

    if (err1 || err2 || err3) {
      setMessage('Error al guardar: ' + (err1?.message || err2?.message || err3?.message));
    } else {
      setMessage('Ajustes guardados correctamente.');
      // Refrescar el contexto local
      await refreshSettings();
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-on-background">Ajustes Globales</h2>
        <p className="text-on-surface-variant text-sm mt-1">Configura las opciones que afectan a toda la aplicación.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline-variant/30 max-w-2xl">
        <h3 className="font-semibold text-lg text-on-background border-b border-outline-variant/30 pb-3 mb-5">Preferencias Regionales</h3>
        
        <div className="flex flex-col gap-2 mb-6">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Moneda Principal</label>
          <p className="text-sm text-on-surface-variant mb-2">Este símbolo se mostrará en los precios, reservas y facturación de todos los usuarios.</p>
          
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-3 outline-none"
          >
            <option value="€">Euro (€)</option>
            <option value="$">Dólar / Peso ($)</option>
            <option value="£">Libra (£)</option>
            <option value="¥">Yen (¥)</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 mb-6 border-t border-outline-variant/30 pt-5">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Pisos Cargados</label>
          <p className="text-sm text-on-surface-variant mb-2">Define las ubicaciones o pisos disponibles en el Punto de Venta. Sepáralos por coma.</p>
          
          <input 
            type="text"
            value={floorsInput}
            onChange={(e) => setFloorsInput(e.target.value)}
            placeholder="Ej: Piso 1, Piso 2, Exterior"
            className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-3 outline-none"
          />
        </div>

        <div className="flex flex-col gap-2 mb-6 border-t border-outline-variant/30 pt-5">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Capacidad del Estacionamiento</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Cocheras Fijas</p>
              <input type="number" value={config.qtyFixed} onChange={(e) => setConfig({...config, qtyFixed: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Cocheras Móviles</p>
              <input type="number" value={config.qtyMobile} onChange={(e) => setConfig({...config, qtyMobile: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant mb-1">Coches en Total</p>
              <input type="number" value={config.qtyTotal} onChange={(e) => setConfig({...config, qtyTotal: Number(e.target.value)})} className="bg-surface-container border border-primary text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6 border-t border-outline-variant/30 pt-5">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Valores Abono Cochera Fija</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Mensual</p>
              <input type="number" value={config.priceMonthly} onChange={(e) => setConfig({...config, priceMonthly: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Trimestral</p>
              <input type="number" value={config.priceQuarterly} onChange={(e) => setConfig({...config, priceQuarterly: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Semestral</p>
              <input type="number" value={config.priceSemiannual} onChange={(e) => setConfig({...config, priceSemiannual: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Anual</p>
              <input type="number" value={config.priceAnnual} onChange={(e) => setConfig({...config, priceAnnual: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6 border-t border-outline-variant/30 pt-5">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Tarifas Cochera Móvil (Por Hora)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Estándar</p>
              <input type="number" step="0.01" value={config.priceMobileStandard} onChange={(e) => setConfig({...config, priceMobileStandard: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Techado</p>
              <input type="number" step="0.01" value={config.priceMobileCovered} onChange={(e) => setConfig({...config, priceMobileCovered: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Camioneta</p>
              <input type="number" step="0.01" value={config.priceMobileVan} onChange={(e) => setConfig({...config, priceMobileVan: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6 border-t border-outline-variant/30 pt-5">
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Valores Abono Cochera Móvil</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Mensual</p>
              <input type="number" value={config.priceMobileMonthly} onChange={(e) => setConfig({...config, priceMobileMonthly: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Trimestral</p>
              <input type="number" value={config.priceMobileQuarterly} onChange={(e) => setConfig({...config, priceMobileQuarterly: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Semestral</p>
              <input type="number" value={config.priceMobileSemiannual} onChange={(e) => setConfig({...config, priceMobileSemiannual: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Valor Anual</p>
              <input type="number" value={config.priceMobileAnnual} onChange={(e) => setConfig({...config, priceMobileAnnual: Number(e.target.value)})} className="bg-surface-container border border-outline-variant text-on-background text-sm rounded-xl p-3 w-full" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-outline-variant/30 pt-5">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
            Guardar Cambios
          </button>

          {message && (
            <span className={`text-sm font-medium ${message.includes('Error') ? 'text-error' : 'text-tertiary'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
