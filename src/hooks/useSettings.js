import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'door_hardware_settings';

const defaultSettings = {
  language: 'en',
  currency: 'PKR',
  theme: 'light',
  biometricEnabled: false,
  autoBackup: true,
};

const SettingsContext = createContext({
  settings: defaultSettings,
  loading: true,
  updateSetting: async () => {},
  resetSettings: async () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((value) => {
        if (value && active) {
          setSettings((current) => ({ ...current, ...JSON.parse(value) }));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    let nextSettings = null;
    setSettings((prev) => {
      nextSettings = { ...prev, [key]: value };
      return nextSettings;
    });
    if (nextSettings) {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    }
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  }, []);

  const contextValue = useMemo(
    () => ({
      settings,
      loading,
      updateSetting,
      resetSettings,
    }),
    [settings, loading, updateSetting, resetSettings]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
