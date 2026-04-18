/**
 * Phase 7 — Container Management (Kho screen).
 * fetchContainers():    GET /admin/containers with filter params
 * fetchStatusHistory(): GET /admin/containers/{id}/status-history
 */
import { apiFetch } from './apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface Container {
  containerId: number;
  containerCode: string;
  cargoType: string;
  containerType: string;
  status: string;
  yardName: string;
  zoneName: string;
  slot: string;
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

export async function fetchContainers(
  filter: ContainerFilter,
  page: number,
  size = 20,
): Promise<PageResult<Container>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filter.keyword?.trim())       params.set('keyword', filter.keyword.trim());
  if (filter.statusName?.trim())    params.set('statusName', filter.statusName.trim());
  if (filter.containerType?.trim()) params.set('containerType', filter.containerType.trim());

  const res = await apiFetch(`/admin/containers?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const data: Rec = json.data ?? json;
  const content: Rec[] = Array.isArray(data)
    ? data
    : Array.isArray(data.content) ? data.content : [];

  return {
    content: content.map((c: Rec) => ({
      containerId:   Number(c.containerId  ?? c.id ?? 0),
      containerCode: String(c.containerCode ?? c.code ?? ''),
      cargoType:     String(c.cargoTypeName ?? c.cargoType ?? ''),
      containerType: String(c.containerType ?? c.sizeType ?? ''),
      status:        String(c.statusName   ?? c.status ?? ''),
      yardName:      String(c.yardName     ?? c.warehouse ?? '—'),
      zoneName:      String(c.zoneName     ?? c.zone ?? '—'),
      slot:          String(c.slotName     ?? c.slot ?? '—'),
    })),
    totalPages:    Number(data.totalPages    ?? 1),
    totalElements: Number(data.totalElements ?? content.length),
  };
}

export async function fetchStatusHistory(containerId: number): Promise<StatusHistoryEntry[]> {
  const res = await apiFetch(`/admin/containers/${containerId}/status-history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const data: unknown = json.data ?? json;
  const list: Rec[] = Array.isArray(data) ? data : [];
  return list.map((h: Rec) => ({
    status:    String(h.statusName ?? h.status ?? ''),
    changedAt: String(h.changedAt  ?? h.timestamp ?? h.date ?? ''),
    note:      String(h.note ?? h.description ?? ''),
  }));
}
