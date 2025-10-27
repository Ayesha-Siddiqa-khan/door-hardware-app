import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getDatabase } from '../database/db';
import { hashPin } from '../utils/security';

const PIN_KEY = 'door_hardware_pin_hash';

export function useSecurity() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [hardwareAvailable, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricAvailable(hardwareAvailable && enrolled);

      const db = await getDatabase();
      const settings = await db.getFirstAsync('SELECT lock_enabled FROM user_security WHERE id = 1');
      setLockEnabled(settings?.lock_enabled === 1);
      setLoading(false);
    })();
  }, []);

  const enableLock = useCallback(async (pin) => {
    const db = await getDatabase();
    const pinHash = await hashPin(pin);
    await Promise.all([
      SecureStore.setItemAsync(PIN_KEY, pinHash),
      db.runAsync('UPDATE user_security SET pin_hash = ?, lock_enabled = 1 WHERE id = 1', [
        pinHash,
      ]),
    ]);
    setLockEnabled(true);
  }, []);

  const disableLock = useCallback(async () => {
    const db = await getDatabase();
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_KEY),
      db.runAsync('UPDATE user_security SET pin_hash = NULL, lock_enabled = 0 WHERE id = 1'),
    ]);
    setLockEnabled(false);
  }, []);

  const verifyPin = useCallback(async (pin) => {
    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedHash) return false;
    const providedHash = await hashPin(pin);
    return storedHash === providedHash;
  }, []);

  const authenticateBiometric = useCallback(async () => {
    if (!biometricAvailable) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Door & Hardware Manager',
      cancelLabel: 'Use PIN',
    });
    return result.success;
  }, [biometricAvailable]);

  return {
    biometricAvailable,
    lockEnabled,
    loading,
    enableLock,
    disableLock,
    verifyPin,
    authenticateBiometric,
  };
}
