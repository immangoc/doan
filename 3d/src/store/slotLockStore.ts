/**
 * Client-side slot lock overrides.
 *
 * Some backend list endpoints may lag in reflecting lock/unlock changes.
 * We keep a small in-memory map keyed by slotId so UI can reflect changes immediately.
 */
type LockState = { locked: boolean; reason?: string | null; updatedAt: number };

let lockBySlotId = new Map<number, LockState>();
const listeners = new Set<() => void>();

export function subscribeSlotLock(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getSlotLockOverrides(): Map<number, LockState> {
  return lockBySlotId;
}

export function setSlotLockOverride(slotId: number, locked: boolean, reason?: string | null): void {
  lockBySlotId = new Map(lockBySlotId);
  lockBySlotId.set(slotId, { locked, reason: reason ?? null, updatedAt: Date.now() });
  listeners.forEach((fn) => fn());
}

export function clearSlotLockOverride(slotId: number): void {
  if (!lockBySlotId.has(slotId)) return;
  lockBySlotId = new Map(lockBySlotId);
  lockBySlotId.delete(slotId);
  listeners.forEach((fn) => fn());
}

export function getEffectiveLock(params: {
  slotId?: number;
  backendLocked?: boolean;
  backendReason?: string | null;
}): { locked: boolean; reason?: string | null } {
  const { slotId, backendLocked, backendReason } = params;
  if (slotId != null) {
    const o = lockBySlotId.get(slotId);
    if (o) return { locked: o.locked, reason: o.reason ?? null };
  }
  return { locked: Boolean(backendLocked), reason: backendReason ?? null };
}

