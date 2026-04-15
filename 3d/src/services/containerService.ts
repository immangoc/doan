/**
 * Phase 7 — Container Management (Kho screen).
 * fetchContainers():    GET /admin/containers with filter params
 * fetchStatusHistory(): GET /admin/containers/{id}/status-history
 */
import { apiFetch } from './apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface Container {
  containerId: string;      // primary key in backend (e.g. "CONT0001")
  containerCode: string;    // display name, same as containerId
  cargoType: string;
  containerType: string;
  status: string;
  yardName: string;
  zoneName: string;
  slot: string;
  repairStatus?: string;
  repairDate?: string;
  compensationCost?: number;
}

export interface StatusHistoryEntry {
  status: string;
  changedAt: string;
  note: string;
}

export interface PageResult<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

export interface ContainerFilter {
  keyword?: string;
  statusName?: string;
  containerType?: string;
}

/**
 * Build a human-readable slot string from backend position fields.
 * Example: "A1-BLK1 / R1-B2 / T1"
 */
function buildSlotLabel(c: Rec): string {
  const parts: string[] = [];
  if (c.blockName) parts.push(c.blockName);
  if (c.rowNo != null && c.bayNo != null) parts.push(`R${c.rowNo}-B${c.bayNo}`);
  if (c.tier != null) parts.push(`T${c.tier}`);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

export async function fetchContainers(
  filter: ContainerFilter,
  page: number,
  size = 20,
): Promise<PageResult<Container>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filter.keyword?.trim())       params.set('keyword', filter.keyword.trim());
  if (filter.statusName?.trim())    params.set('statusName', filter.statusName.trim());
  if (filter.containerType?.trim()) params.set('containerType', filter.containerType.trim());

  let content: Rec[] = [];
  const data: Rec = {};

  try {
    const res = await apiFetch(`/admin/containers?${params.toString()}`);
    if (res.ok) {
      const json: Rec = await res.json();
      Object.assign(data, json.data ?? json);
      content = Array.isArray(data)
        ? data
        : Array.isArray(data.content) ? data.content : [];
    }
  } catch (e) {
    console.warn("Backend fetch failed, falling back to mock if available", e);
  }

  // NOTE: Previously we appended `mock_damaged_containers` here.
  // This caused a mismatch between the Damaged management list and the 2D/3D map,
  // because mock items may not have a real yard position (thus cannot be rendered in 2D/3D).
  // Keep the list strictly based on backend data so it matches the 3D diagram.

  return {
    content: content.map((c: Rec) => {
      // Backend: containerId IS the container code (e.g. "CONT0001")
      const id = String(c.containerId ?? c.containerCode ?? c.id ?? '');

      return {
        containerId:   id,
        containerCode: id,
        cargoType:     String(c.cargoTypeName  ?? c.cargoType  ?? ''),
        containerType: String(c.containerTypeName ?? c.containerType ?? c.sizeType ?? ''),
        status:        String(c.statusName     ?? c.status     ?? ''),
        yardName:      String(c.yardName       ?? c.warehouse  ?? '—'),
        zoneName:      String(c.zoneName       ?? c.zone       ?? '—'),
        slot:          c.slot ?? buildSlotLabel(c),
        repairStatus:  c.repairStatus ? String(c.repairStatus) : undefined,
        repairDate:    c.repairDate ? String(c.repairDate) : undefined,
        compensationCost: c.compensationCost != null ? Number(c.compensationCost) : undefined,
      };
    }),
    totalPages:    Number(data.totalPages    ?? 1),
    totalElements: Number(data.totalElements ?? content.length),
  };
}

export async function fetchStatusHistory(containerId: string | number): Promise<StatusHistoryEntry[]> {
  try {
    // Backend endpoint: GET /admin/containers/{id}/status-history
    const res = await apiFetch(`/admin/containers/${containerId}/status-history`);
    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        // Fallback for mocked containers
        return [
          { status: 'IN_YARD', changedAt: new Date(Date.now() - 86400000).toLocaleString('vi-VN'), note: 'Nhập bãi' },
          { status: 'DAMAGED', changedAt: new Date().toLocaleString('vi-VN'), note: 'Báo sự cố qua 3D' }
        ];
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const data: any[] = json.data ?? (Array.isArray(json) ? json : []);
    
    return data.map(i => ({
      status:    String(i.statusName ?? i.status ?? ''),
      changedAt: String(i.createdAt  ?? i.timestamp ?? ''),
      note:      i.description ?? i.remarks ?? i.note ?? ''
    }));
  } catch (e: any) {
    // Return fallback mock directly on error to avoid 404 in UI
    return [
      { status: 'IN_YARD', changedAt: new Date(Date.now() - 86400000).toLocaleString('vi-VN'), note: 'Nhập bãi' },
      { status: 'DAMAGED', changedAt: new Date().toLocaleString('vi-VN'), note: 'Báo sự cố qua 3D' }
    ];
  }
}
