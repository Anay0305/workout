import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForBluetooth } from '../src/platform/bluetooth-state';

type Adapter = Parameters<typeof waitForBluetooth>[0];
type State = Parameters<Parameters<Adapter['onStateChange']>[0]>[0];
function adapter(initial: State) {
  let listener: (state: State) => void = () => {};
  let removed = 0;
  return {
    onStateChange(callback: typeof listener, emitCurrentState: boolean) {
      listener = callback;
      if (emitCurrentState) callback(initial);
      return { remove() { removed++; } };
    },
    emit(state: State) { listener(state); },
    get removed() { return removed; },
  };
}

test('Bluetooth waits through iOS initialization and removes the listener when ready', async () => {
  const bluetooth = adapter('Unknown');
  const ready = waitForBluetooth(bluetooth);
  bluetooth.emit('Resetting');
  assert.equal(bluetooth.removed, 0);
  bluetooth.emit('PoweredOn');
  await ready;
  assert.equal(bluetooth.removed, 1);
  bluetooth.emit('PoweredOff');
  assert.equal(bluetooth.removed, 1);
});

test('Bluetooth handles already-ready devices and permission/device failures', async () => {
  const ready = adapter('PoweredOn');
  await waitForBluetooth(ready);
  assert.equal(ready.removed, 1);
  for (const [state, message] of [
    ['Unauthorized', /Allow Workout to use Bluetooth/],
    ['PoweredOff', /Turn Bluetooth on/],
    ['Unsupported', /physical phone/],
  ] as const) {
    const bluetooth = adapter(state);
    await assert.rejects(waitForBluetooth(bluetooth), message);
    assert.equal(bluetooth.removed, 1);
  }
});

test('Bluetooth times out cleanly if initialization never finishes', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const bluetooth = adapter('Unknown');
  const result = assert.rejects(waitForBluetooth(bluetooth), /Bluetooth is not ready/);
  context.mock.timers.tick(30000);
  await result;
  assert.equal(bluetooth.removed, 1);
});

test('Bluetooth propagates native subscription errors without a dangling timeout', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const bluetooth = { onStateChange() { throw new Error('Native Bluetooth unavailable'); } };
  await assert.rejects(waitForBluetooth(bluetooth), /Native Bluetooth unavailable/);
  context.mock.timers.tick(30000);
});
