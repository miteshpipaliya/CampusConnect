/** Convert legacy ISO dates and Firestore timestamp values into epoch milliseconds. */
export function toMillis(value: unknown): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : NaN;
  if (typeof value === 'string') {
    if (!value.trim()) return NaN;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as { toMillis?: unknown; seconds?: unknown; nanoseconds?: unknown };
    if (typeof v.toMillis === 'function') {
      try {
        const n: unknown = v.toMillis();
        return typeof n === 'number' && Number.isFinite(n) ? n : NaN;
      } catch { return NaN; }
    }
    if (typeof v.seconds === 'number' && Number.isFinite(v.seconds) &&
        typeof v.nanoseconds === 'number' && Number.isInteger(v.nanoseconds) &&
        v.nanoseconds >= 0 && v.nanoseconds < 1_000_000_000) {
      const millis = v.seconds * 1000 + Math.floor(v.nanoseconds / 1_000_000);
      return Number.isFinite(millis) ? millis : NaN;
    }
  }
  return NaN;
}
