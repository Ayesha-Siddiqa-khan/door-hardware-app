import * as Crypto from 'expo-crypto';

export async function hashPin(pin) {
  if (!pin) return '';
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export function maskPin(pin) {
  return pin ? '•'.repeat(pin.length) : '';
}
