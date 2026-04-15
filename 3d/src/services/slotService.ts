import { apiFetch } from './apiClient';

export interface SlotDto {
  slotId: number;
  blockId?: number;
  blockName?: string;
  rowNo: number;
  bayNo: number;
  maxTier: number;
  locked?: boolean;
  lockReason?: string | null;
  lockedAt?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function unwrapData(json: Rec): Rec {
  return (json?.data ?? json) as Rec;
}

export async function fetchSlot(slotId: number): Promise<SlotDto> {
  const res = await apiFetch(`/admin/slots/${slotId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching slot ${slotId}`);
  const json: Rec = await res.json();
  const d = unwrapData(json);
  return {
    slotId: Number(d.slotId ?? d.id),
    blockId: d.blockId != null ? Number(d.blockId) : undefined,
    blockName: d.blockName != null ? String(d.blockName) : undefined,
    rowNo: Number(d.rowNo ?? 1),
    bayNo: Number(d.bayNo ?? 1),
    maxTier: Number(d.maxTier ?? 1),
    locked: Boolean(d.locked ?? d.isLocked ?? d.is_locked ?? false),
    lockReason: d.lockReason ?? d.lock_reason ?? null,
    lockedAt: d.lockedAt ?? d.locked_at ?? null,
  };
}

export async function lockSlot(slotId: number, reason?: string): Promise<void> {
  const res = await apiFetch(`/admin/slots/${slotId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} locking slot ${slotId}${text ? `: ${text}` : ''}`);
  }
}

export async function unlockSlot(slotId: number): Promise<void> {
  const res = await apiFetch(`/admin/slots/${slotId}/unlock`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} unlocking slot ${slotId}${text ? `: ${text}` : ''}`);
  }
}

