/**
 * Reactive store for damage workflow state.
 *
 * Holds the list of damage reports in PENDING / RELOCATING status (Pha 1
 * sau khi báo, trước khi chuyển vào kho hỏng). Components subscribe via
 * useSyncExternalStore.
 *
 * Source of truth: `GET /admin/damage/pending` — refreshed manually after
 * any damage action and on a slow polling interval.
 */
import { fetchPendingDamages, type DamageReport } from '../services/damageService';

let pending: DamageReport[]               = [];
let pendingByCode: Map<string, DamageReport> = new Map();
const listeners = new Set<() => void>();

export function subscribeDamage(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getPendingDamages(): DamageReport[] {
  return pending;
}

export function getPendingByCodeMap(): Map<string, DamageReport> {
  return pendingByCode;
}

export function isContainerDamageReported(containerCode: string): boolean {
  if (!containerCode) return false;
  return pendingByCode.has(containerCode);
}

function setPending(next: DamageReport[]): void {
  pending = next;
  pendingByCode = new Map(next.map((r) => [r.containerCode, r]));
  listeners.forEach((fn) => fn());
}

/** Pull latest from backend; swallows errors (UI keeps last snapshot). */
export async function refreshDamages(): Promise<DamageReport[]> {
  try {
    const list = await fetchPendingDamages();
    setPending(list);
    return list;
  } catch {
    return pending;
  }
}

/** Optimistically mark a container as pending (before backend ack). */
export function markPendingOptimistic(report: DamageReport): void {
  if (pendingByCode.has(report.containerCode)) return;
  setPending([report, ...pending]);
}

/** Optimistically clear a container (after move-to-damaged or cancel). */
export function clearPendingOptimistic(containerCode: string): void {
  if (!pendingByCode.has(containerCode)) return;
  setPending(pending.filter((r) => r.containerCode !== containerCode));
}
