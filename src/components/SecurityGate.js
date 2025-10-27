import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useSecurity } from '../hooks/useSecurity';
import { maskPin } from '../utils/security';

export function SecurityGate({ children }) {
  const { loading, lockEnabled, biometricAvailable, authenticateBiometric, verifyPin } = useSecurity();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attemptedBiometric, setAttemptedBiometric] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!lockEnabled) {
      setUnlocked(true);
      return;
    }
    setUnlocked(false);
    if (biometricAvailable && !attemptedBiometric) {
      (async () => {
        setAttemptedBiometric(true);
        const success = await authenticateBiometric();
        if (success) {
          setUnlocked(true);
        }
      })();
    }
  }, [loading, lockEnabled, biometricAvailable, attemptedBiometric, authenticateBiometric]);

  const handleUnlock = async () => {
    const success = await verifyPin(pin);
    if (success) {
      setUnlocked(true);
      setPin('');
      setError('');
    } else {
      setError('Incorrect PIN');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (unlocked) {
    return children;
  }

  return (
    <View style={styles.lockScreen}>
      <Text variant="headlineSmall" style={styles.title}>
        Enter PIN to Continue
      </Text>
      {biometricAvailable ? (
        <Text variant="bodySmall" style={styles.subtitle}>
          Biometric authentication available
        </Text>
      ) : null}
      <TextInput
        label="PIN"
        value={pin}
        onChangeText={(value) => {
          setPin(value);
          setError('');
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        mode="outlined"
        style={styles.input}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <Button mode="contained" onPress={handleUnlock}>
        Unlock
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F7F9FC',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 8,
    color: '#6B778D',
  },
  input: {
    width: '80%',
    marginBottom: 12,
  },
});

