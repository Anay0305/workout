type BluetoothState = 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn';
type Subscription = { remove(): void };
type BluetoothAdapter = {
  onStateChange(listener: (state: BluetoothState) => void, emitCurrentState: boolean): Subscription;
};

// CoreBluetooth can report Unknown/Resetting while initializing or asking for permission.
export function waitForBluetooth(adapter: BluetoothAdapter, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    let subscription: Subscription | undefined;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subscription?.remove();
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => finish(new Error('Bluetooth is not ready. Check Bluetooth permission in Settings, then try again.')), timeoutMs);
    try {
      subscription = adapter.onStateChange(state => {
        if (state === 'PoweredOn') finish();
        else if (state === 'Unauthorized') finish(new Error('Allow Workout to use Bluetooth in your device Settings, then scan again.'));
        else if (state === 'PoweredOff') finish(new Error('Turn Bluetooth on, then scan again.'));
        else if (state === 'Unsupported') finish(new Error('Bluetooth scales are not supported on this device. Use a physical phone or enter a measurement manually.'));
      }, true);
      if (settled) subscription.remove();
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Could not check Bluetooth availability.'));
    }
  });
}
