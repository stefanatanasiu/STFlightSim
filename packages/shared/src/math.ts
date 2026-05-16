export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp(amount, 0, 1);
}

export function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

export function normalizeHeadingDeg(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function shortestAngleDeltaDeg(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
