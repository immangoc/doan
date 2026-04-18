/**
 * Phase 7 — Gate-In Management (HaBai screen).
 * fetchGateInRecords(): GET /admin/gate-in?page=&size=
 *
 * Backend GateInReceiptResponse fields:
 *   gateInId, containerId, voyageId, voyageNo,
 *   gateInTime, createdById, createdByUsername, operatorName, note,
 *   cargoTypeName, containerTypeName,
 *   yardName, zoneName,
 *   blockName, rowNo, bayNo, tier
 */
import { apiFetch } from './apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface GateInRecord {
  id: number;
  containerCode: string;     // containerId field from backend
  voyageNo: string;
  cargoType: string;         // cargoTypeName
  containerType: string;     // containerTypeName (e.g. "20ft", "40ft")
  grossWeight: string;       // formatted "25,000 kg"
  status: string;            // statusName
  yardName: string;
  zoneName: string;
  blockName: string;
  rowNo: number;
  bayNo: number;
  tier: number;
  slot: string;              // built label "R1B2/T1"
  gateInTime: string;
  operator: string;          // operatorName / createdByUsername
  note: string;
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
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sortBy: 'gateInTime',
    direction: 'desc',
  });
  const res = await apiFetch(`/admin/gate-in?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  // Backend wraps in { data: { content: [], totalPages: N, totalElements: N } }
  const data: Rec = json.data ?? json;
  const content: Rec[] = Array.isArray(data)
    ? data
    : Array.isArray(data.content) ? data.content : [];

  return {
    content: content.map((r: Rec) => {
      const rowNo = Number(r.rowNo ?? 0);
      const bayNo = Number(r.bayNo ?? 0);
      const tier = Number(r.tier ?? 0);
      const row = rowNo > 0 ? `R${rowNo}` : '';
      const bay = bayNo > 0 ? `B${bayNo}` : '';
      const tierStr = tier > 0 ? `/T${tier}` : '';
      const slotLabel = `${row}${bay}${tierStr}` || '—';
      const weightStr = r.grossWeight != null
        ? `${Number(r.grossWeight).toLocaleString('vi-VN')} kg` : '—';
      return {
        id: Number(r.gateInId ?? r.id ?? 0),
        containerCode: String(r.containerId ?? ''),
        voyageNo: String(r.voyageNo ?? (r.voyageId ? `#${r.voyageId}` : '')),
        cargoType: String(r.cargoTypeName ?? ''),
        containerType: String(r.containerTypeName ?? ''),
        grossWeight: weightStr,
        status: String(r.statusName ?? ''),
        yardName: String(r.yardName ?? ''),
        zoneName: String(r.zoneName ?? ''),
        blockName: String(r.blockName ?? ''),
        rowNo,
        bayNo,
        tier,
        slot: slotLabel,
        gateInTime: formatDateTime(String(r.gateInTime ?? '')),
        operator: String(r.operatorName ?? r.createdByUsername ?? ''),
        note: String(r.note ?? ''),
      };
    }),
    totalPages: Number(data.totalPages ?? 1),
    totalElements: Number(data.totalElements ?? content.length),
  };
}
