const MAX_QUEUED_TOASTS = 5;

export function enqueueToast<T extends {
  message: string; type: string; id?: string | number; replaceKey?: string; expiresAt?: number;
}>(queue: T[], toast: T, now = Date.now()): T[] {
  const live = queue.filter((item) => !item.expiresAt || item.expiresAt > now);
  const previous = toast.replaceKey ? live.find((item) => item.replaceKey === toast.replaceKey) : undefined;
  if (!previous && live.some((item) => item.message === toast.message && item.type === toast.type)) {
    return live.length === queue.length ? queue : live;
  }
  const updated = previous ? { ...toast, id: previous.id } : toast;
  // New messages take the front immediately; older messages remain underneath.
  return [updated, ...live.filter((item) => !toast.replaceKey || item.replaceKey !== toast.replaceKey)]
    .slice(0, MAX_QUEUED_TOASTS);
}
