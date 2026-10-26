import type { Measurement } from '../data/types';

// Keep the Android native modules out of the iOS bundle entirely.
export async function openCultConnect(): Promise<void> {
  throw new Error('Use your scale’s iPhone companion app, or connect a compatible Bluetooth scale here.');
}

export async function openHealthSettings(): Promise<void> {
  throw new Error('Health Connect is Android-only. Apple Health import is not available in this version.');
}

export async function readHealthMeasurements(): Promise<Measurement[]> {
  throw new Error('Use Bluetooth or enter measurements manually on iPhone. Apple Health import is not available in this version.');
}
