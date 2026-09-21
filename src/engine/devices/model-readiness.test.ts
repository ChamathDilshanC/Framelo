import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginDevicePreparation, hasPendingModelLoads, waitForDeviceModels } from './model-loader';

afterEach(() => vi.unstubAllGlobals());

describe('device readiness', () => {
  it('keeps export waiting for all media/GPU/reveal work, not only the download', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
    const first = beginDevicePreparation();
    const second = beginDevicePreparation();
    let exported = false;
    const waiting = waitForDeviceModels().then(() => { exported = true; });
    await Promise.resolve();
    expect(hasPendingModelLoads()).toBe(true);
    expect(exported).toBe(false);
    first(); first(); // Strict-mode cleanup and frame completion are idempotent.
    await Promise.resolve();
    expect(hasPendingModelLoads()).toBe(true);
    expect(exported).toBe(false);
    second();
    await waiting;
    expect(hasPendingModelLoads()).toBe(false);
    expect(exported).toBe(true);
  });
});
