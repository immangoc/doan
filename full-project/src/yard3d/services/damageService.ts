/**
 * Damage workflow service (2-phase).
 *
 * Pha 1 — reportDamage(): POST /admin/damage/report
 *   Đánh dấu container là DAMAGED_PENDING. KHÔNG di chuyển vật lý.
 *
 * Pha 2 — moveToDamagedYard(): POST /admin/damage/{id}/move-to-damaged-yard
 *   Đảo các container chặn (BFS) rồi chuyển target vào kho hỏng.
 *
 * Cancel — cancelDamage(): DELETE /admin/damage/{id}
 *   Huỷ báo hỏng (chỉ khi PENDING).
 */
import { apiFetch } from './apiClient';
import { refreshOccupancy } from './gateInService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DamageReportPayload {
  containerId: string;
  severity?:   'MINOR' | 'MAJOR' | 'CRITICAL';
  reason?:     string;
  photoUrls?:  string[];
}

export interface DamageReport {
  reportId:        number;
  containerId:     string;
  containerCode:   string;
  cargoTypeName?:  string;
  sizeType?:       string;
  currentYard?:    string;
  currentZone?:    string;
  currentTier?:    number;
  currentSlot?:    string;
  grossWeight?:    string;
  severity?:       string;
  reason?:         string;
  photoUrls:       string[];
  reportedBy?:     string;
  reportedAt?:     string;
  reportStatus:    'PENDING' | 'RELOCATING' | 'STORED' | 'CANCELLED';
  completedAt?:    string;
  repairStatus?:   string;
  repairDate?:     string;
  compensationCost?: number;
  compensationRefunded?: boolean;
  compensationRefundedAt?: string;
}

export interface RelocationMove {
  containerId: string;
  fromSlotId?: number;
  fromZone?:   string;
  fromRow?:    number;
  fromBay?:    number;
  fromTier?:   number;
  toSlotId?:   number;
  toZone?:     string;
  toRow?:      number;
  toBay?:      number;
  toTier?:     number;
  purpose?:    string;
}

export interface RelocationPlan {
  reportId?:           number;
  targetContainerId:   string;
  feasible:            boolean;
  infeasibilityReason?: string;
  moves:               RelocationMove[];
  blockerCount:        number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body : ''}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/** Pha 1 — chỉ đánh dấu, container chưa di chuyển. */
export async function reportDamage(payload: DamageReportPayload): Promise<DamageReport> {
  const res = await apiFetch('/admin/damage/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const report = await unwrap<DamageReport>(res);
  await refreshOccupancy();
  return report;
}

/** Danh sách container chờ chuyển vào kho hỏng. */
export async function fetchPendingDamages(): Promise<DamageReport[]> {
  const res = await apiFetch('/admin/damage/pending');
  return unwrap<DamageReport[]>(res);
}

/** Tất cả damage_report (đã báo + đã chuyển), không bao gồm CANCELLED. */
export async function fetchAllDamages(): Promise<DamageReport[]> {
  const res = await apiFetch('/admin/damage/all');
  return unwrap<DamageReport[]>(res);
}

/** Dry-run — tính plan đảo container chặn, KHÔNG thực thi. */
export async function previewMove(containerId: string): Promise<RelocationPlan> {
  const res = await apiFetch(
    `/admin/damage/${encodeURIComponent(containerId)}/preview-move`,
    { method: 'POST' },
  );
  return unwrap<RelocationPlan>(res);
}

export interface MoveToDamagedYardPayload {
  expectedRepairDate?: string; // yyyy-MM-dd
  compensationCost?:   number;
  repairNote?:         string;
}

/** Pha 2 — thực thi: đảo blocker rồi chuyển vào kho hỏng. */
export async function moveToDamagedYard(
  containerId: string,
  payload?: MoveToDamagedYardPayload,
): Promise<DamageReport> {
  const res = await apiFetch(
    `/admin/damage/${encodeURIComponent(containerId)}/move-to-damaged-yard`,
    {
      method: 'POST',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body:    payload ? JSON.stringify(payload) : undefined,
    },
  );
  const report = await unwrap<DamageReport>(res);
  await refreshOccupancy();
  return report;
}

/** Huỷ báo hỏng (chỉ khi PENDING). */
export async function cancelDamage(containerId: string): Promise<DamageReport> {
  const res = await apiFetch(`/admin/damage/${encodeURIComponent(containerId)}`, {
    method: 'DELETE',
  });
  const report = await unwrap<DamageReport>(res);
  await refreshOccupancy();
  return report;
}

export interface ReturnPreview {
  slotId:           number;
  rowNo:            number;
  bayNo:            number;
  recommendedTier:  number;
  blockName:        string;
  zoneName:         string;
  yardName:         string;
  finalScore:       number;
  mlScore?:         number;
  movesNorm?:       number;
  exitNorm?:        number;
  futureBlockNorm?: number;
  relocationsEstimated?: number;
}

/** Dry-run — trả về vị trí ML đề xuất, không thực thi. */
export async function previewReturnToYard(containerId: string): Promise<ReturnPreview> {
  const res = await apiFetch(
    `/admin/damage/${encodeURIComponent(containerId)}/preview-return`,
    { method: 'POST' },
  );
  return unwrap<ReturnPreview>(res);
}

/**
 * Chuyển container đã sửa xong về kho gốc — ML chọn slot tối ưu.
 * Yêu cầu container.repair_status = REPAIRED.
 */
export async function returnToYard(containerId: string): Promise<DamageReport> {
  const res = await apiFetch(
    `/admin/damage/${encodeURIComponent(containerId)}/return-to-yard`,
    { method: 'POST' },
  );
  const report = await unwrap<DamageReport>(res);
  await refreshOccupancy();
  return report;
}
