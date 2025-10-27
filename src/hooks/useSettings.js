import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'door_hardware_settings';

const defaultSettings = {
  language: 'en',
  currency: 'PKR',
  theme: 'light',
  biometricEnabled: false,
  autoBackup: true,
};

export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((value) => {
        if (value) {
          setSettings((current) => ({ ...current, ...JSON.parse(value) }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  }, []);

  return {
    settings,
    loading,
    updateSetting,
    resetSettings,
  };
}
