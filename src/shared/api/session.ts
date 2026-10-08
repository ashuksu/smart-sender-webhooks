import { invalidateCsrfToken } from './csrf';

let active = false;
let generation = 0;
const endedListeners = new Set<() => void>();

export function isSessionActive(): boolean {
  return active;
}

export function startSession(): void {
  active = true;
}

/** Incremented after every successful rotate; lets late 401s skip a redundant rotate. */
export function getSessionGeneration(): number {
  return generation;
}

export function bumpSessionGeneration(): void {
  generation += 1;
}

/** Idempotent: listeners fire once per session. */
export function endSession(): void {
  if (!active) return;
  active = false;
  invalidateCsrfToken();
  endedListeners.forEach((listener) => listener());
}

export function onSessionEnded(listener: () => void): () => void {
  endedListeners.add(listener);
  return () => {
    endedListeners.delete(listener);
  };
}
