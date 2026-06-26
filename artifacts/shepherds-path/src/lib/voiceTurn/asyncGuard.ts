/** Invalidate stale async voice callbacks when a new speak/capture cycle begins. */
export function createVoiceEpochGuard() {
  let epoch = 0;

  return {
    bump(): number {
      epoch += 1;
      return epoch;
    },
    current(): number {
      return epoch;
    },
    isStale(captured: number): boolean {
      return captured !== epoch;
    },
    /** Run async work; returns undefined if epoch changed before completion. */
    async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
      const id = ++epoch;
      const result = await fn();
      if (id !== epoch) return undefined;
      return result;
    },
  };
}

export type VoiceEpochGuard = ReturnType<typeof createVoiceEpochGuard>;
