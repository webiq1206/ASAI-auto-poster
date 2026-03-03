export const KEYSTROKE_MIN = 40;
export const KEYSTROKE_MAX = 100;
export const FIELD_PAUSE_MIN = 200;
export const FIELD_PAUSE_MAX = 800;
export const PRE_SUBMIT_PAUSE = 2000;
export const PHOTO_UPLOAD_PAUSE = 1500;

export function gaussianRandom(mean: number, stddev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, Math.round(mean + z * stddev));
}

export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function keystrokeDelay(): Promise<void> {
  const ms = gaussianRandom(
    (KEYSTROKE_MIN + KEYSTROKE_MAX) / 2,
    (KEYSTROKE_MAX - KEYSTROKE_MIN) / 4,
  );
  const clamped = Math.max(KEYSTROKE_MIN, Math.min(KEYSTROKE_MAX, ms));
  return new Promise((resolve) => setTimeout(resolve, clamped));
}

export function fieldPause(): Promise<void> {
  return randomDelay(FIELD_PAUSE_MIN, FIELD_PAUSE_MAX);
}

export interface TimingConfig {
  keystrokeMin?: number;
  keystrokeMax?: number;
  fieldPauseMin?: number;
  fieldPauseMax?: number;
}
