import { createContext, useContext, useEffect, useState } from 'react';
import { getSettings } from '../services/settingsService';

const SettingsContext = createContext({ showPlantDescription: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ showPlantDescription: true });

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
