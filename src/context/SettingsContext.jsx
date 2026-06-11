import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
  const [currency, setCurrency] = useState('€');
  const [floors, setFloors] = useState([]);
  
  // Nuevos estados para cocheras
  const [spotConfig, setSpotConfig] = useState({
    qtyFixed: 20,
    qtyMobile: 50,
    qtyTotal: 70,
    priceMonthly: 5000,
    priceQuarterly: 14000,
    priceSemiannual: 27000,
    priceAnnual: 50000,
    priceMobileStandard: 2.50,
    priceMobileCovered: 3.50,
    priceMobileVan: 5.00,
    priceMobileMonthly: 4000,
    priceMobileQuarterly: 11000,
    priceMobileSemiannual: 20000,
    priceMobileAnnual: 38000
  });

  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (!error && data) {
      const currencySetting = data.find(s => s.key === 'currency');
      if (currencySetting) {
        setCurrency(currencySetting.value);
      }
      const floorsSetting = data.find(s => s.key === 'floors');
      if (floorsSetting && floorsSetting.value) {
        setFloors(floorsSetting.value.split(',').map(f => f.trim()).filter(f => f));
      }
      const getVal = (key, defaultVal) => {
        const found = data.find(s => s.key === key);
        return found ? Number(found.value) : defaultVal;
      };

      setSpotConfig({
        qtyFixed: getVal('qty_fixed_spots', 20),
        qtyMobile: getVal('qty_mobile_spots', 50),
        qtyTotal: getVal('qty_total_cars', 70),
        priceMonthly: getVal('price_fixed_monthly', 5000),
        priceQuarterly: getVal('price_fixed_quarterly', 14000),
        priceSemiannual: getVal('price_fixed_semiannual', 27000),
        priceAnnual: getVal('price_fixed_annual', 50000),
        priceMobileStandard: getVal('price_mobile_standard', 2.50),
        priceMobileCovered: getVal('price_mobile_covered', 3.50),
        priceMobileVan: getVal('price_mobile_van', 5.00),
        priceMobileMonthly: getVal('price_mobile_monthly', 4000),
        priceMobileQuarterly: getVal('price_mobile_quarterly', 11000),
        priceMobileSemiannual: getVal('price_mobile_semiannual', 20000),
        priceMobileAnnual: getVal('price_mobile_annual', 38000),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();

    // Suscribirse a cambios en la tabla app_settings para actualizar la UI en tiempo real
    const subscription = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ currency, floors, spotConfig, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
