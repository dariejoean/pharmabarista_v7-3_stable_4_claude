import { ShotData } from '../types';

/**
 * Computes a stable hash of the key extraction parameters.
 * Used for Gemini analysis caching: if the hash matches an existing
 * analysis in geminiHistory, the cached result is returned instead
 * of making a new API call.
 */
export function computeShotHash(shot: Partial<ShotData>): string {
  const parts = [
    shot.machineName || '',
    shot.beanName || '',
    String(shot.doseIn ?? 0),
    String(shot.yieldOut ?? 0),
    String(shot.time ?? 0),
    String(shot.temperature ?? 0),
    String(shot.pressure ?? 0),
    String(shot.grindSetting ?? ''),
    shot.waterName || '',
    shot.tampLevel || '',
    shot.grindScaleType || '',
    String(shot.avgPressure ?? ''),
    String(shot.maxPressure ?? ''),
  ].join('|');

  // djb2 hash — fast, deterministic, no crypto needed
  let hash = 5381;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) + hash) ^ parts.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }
  return Math.abs(hash).toString(36);
}
