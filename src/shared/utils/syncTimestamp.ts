/** Convert remote timestamps into finite SQLite milliseconds without inventing an edit time. */
export function normalizeSyncTimestamp(value: unknown): number {
  try {
    let milliseconds: number;
    if (typeof value === "number") {
      milliseconds = value;
    } else if (typeof value === "string" && value.trim()) {
      milliseconds = Number(value);
      if (!Number.isFinite(milliseconds)) milliseconds = Date.parse(value);
    } else if (value instanceof Date) {
      milliseconds = value.getTime();
    } else if (value && typeof value === "object") {
      const timestamp = value as {
        toMillis?: () => number;
        toDate?: () => Date;
        seconds?: number;
        nanoseconds?: number;
        _seconds?: number;
        _nanoseconds?: number;
      };
      if (typeof timestamp.toMillis === "function") {
        milliseconds = timestamp.toMillis();
      } else if (typeof timestamp.toDate === "function") {
        milliseconds = timestamp.toDate().getTime();
      } else {
        const seconds = timestamp.seconds ?? timestamp._seconds;
        const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
        milliseconds = typeof seconds === "number" ? seconds * 1000 + nanoseconds / 1e6 : NaN;
      }
    } else {
      return 0;
    }
    return Number.isFinite(milliseconds) && milliseconds >= 0 && milliseconds <= 8.64e15
      ? Math.floor(milliseconds)
      : 0;
  } catch {
    return 0;
  }
}
