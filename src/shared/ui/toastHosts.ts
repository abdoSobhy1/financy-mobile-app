// React Native modals need their own overlay, but only the top visible host
// should render cards or run their dismissal timers.
export class ToastHosts {
  private hosts = new Map<string, number>();
  private listeners = new Set<() => void>();

  getActive = (): string | null => {
    let active: string | null = null;
    let priority = -Infinity;
    for (const [id, level] of this.hosts) {
      if (level >= priority) { active = id; priority = level; }
    }
    return active;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  register(id: string, priority: number): () => void {
    this.hosts.set(id, priority);
    this.listeners.forEach((listener) => listener());
    return () => {
      this.hosts.delete(id);
      this.listeners.forEach((listener) => listener());
    };
  }
}

export const toastHosts = new ToastHosts();
