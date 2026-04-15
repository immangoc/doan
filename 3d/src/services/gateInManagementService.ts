/**
 * Phase 7 — Gate-In Management (HaBai screen).
 * fetchGateInRecords(): GET /admin/gate-in?page=&size=
 */
import { apiFetch } from './apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface GateInRecord {
  id: number;
  containerCode: string;
  cargoType: string;
  blockName: string;
  rowNo: number;
  bayNo: number;
  tier: number;
  gateInTime: string;
  operator: string;
}

export interface PageResult<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

function formatDateTime(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

export async function fetchGateInRecords(page: number, size = 20): Promise<PageResult<GateInRecord>> {
  const res = await apiFetch(`/admin/gate-in?page=${page}&size=${size}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const data: Rec = json.data ?? json;
  const content: Rec[] = Array.isArray(data)
    ? data
    : Array.isArray(data.content) ? data.content : [];

  return {
    content: content.map((r: Rec) => ({
      id:            Number(r.id ?? r.gateInId ?? 0),
      containerCode: String(r.containerId ?? r.containerCode ?? r.code ?? ''),
      cargoType:     String(r.cargoTypeName ?? r.cargoType ?? ''),
      blockName:     String(r.blockName ?? r.block ?? '—'),
      rowNo:         Number(r.rowNo ?? r.row ?? 0),
      bayNo:         Number(r.bayNo ?? r.bay ?? 0),
      tier:          Number(r.tier ?? r.floor ?? 0),
      gateInTime:    formatDateTime(String(r.gateInTime ?? r.createdAt ?? r.timestamp ?? '')),
      operator:      String(r.operatorName ?? r.operator ?? r.createdBy ?? '—'),
    })),
    totalPages:    Number(data.totalPages ?? 1),
    totalElements: Number(data.totalElements ?? content.length),
  };
}
