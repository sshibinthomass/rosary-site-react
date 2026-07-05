import { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext({ showPlantDescription: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ showPlantDescription: true });

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const { getSettings } = await import('../services/settingsService');
        const nextSettings = await getSettings();
        if (!cancelled) setSettings(nextSettings);
      } catch (error) {
        console.error('Failed to load site settings:', error);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(loadSettings, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(loadSettings, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
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
