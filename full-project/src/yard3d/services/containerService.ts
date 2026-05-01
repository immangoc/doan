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
    blockName: string;
    slot: string;
    grossWeight: string;
    declaredValue: string;
    sealNumber: string;
    note: string;
    createdAt: string;
    gateOutTime: string;
    repairStatus: string;
    repairDate: string;
    compensationCost: string;
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
    yardName?: string;
    containerType?: string;
}

export async function fetchContainers(
    filter: ContainerFilter,
    page: number,
    size = 20,
): Promise<PageResult<Container>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filter.keyword?.trim()) params.set('keyword', filter.keyword.trim().replace('#', ''));
    if (filter.statusName?.trim()) params.set('statusName', filter.statusName.trim());
    if (filter.yardName?.trim()) params.set('yardName', filter.yardName.trim());
    if (filter.containerType?.trim()) params.set('containerType', filter.containerType.trim());

    const res = await apiFetch(`/admin/containers?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json: Rec = await res.json();
    const data: Rec = json.data ?? json;
    const content: Rec[] = Array.isArray(data)
        ? data
        : Array.isArray(data.content) ? data.content : [];

    return {
        content: content.map((c: Rec) => {
            const row = c.rowNo != null ? `R${c.rowNo}` : null;
            const bay = c.bayNo != null ? `B${c.bayNo}` : null;
            const tier = c.tier != null ? `T${c.tier}` : null;
            const built = [row, bay].filter(Boolean).join('') + (tier ? `/${tier}` : '');
            const slotLabel = String(c.slotName ?? c.slot ?? (built || '—'));
            const weightStr = c.grossWeight != null ? `${Number(c.grossWeight).toLocaleString('vi-VN')} kg` : '—';
            const declaredStr = c.declaredValue != null && Number(c.declaredValue) > 0
                ? `${Number(c.declaredValue).toLocaleString('vi-VN')} VND` : '—';
            return {
                containerId: Number(c.containerId ?? c.id ?? 0),
                containerCode: String(c.containerId ?? c.containerCode ?? c.code ?? ''),
                cargoType: String(c.cargoTypeName ?? c.cargoType ?? ''),
                containerType: String(c.containerTypeName ?? c.containerType ?? c.sizeType ?? ''),
                status: String(c.statusName ?? c.status ?? ''),
                yardName: String(c.yardName ?? c.warehouse ?? '—'),
                zoneName: String(c.zoneName ?? c.zone ?? '—'),
                blockName: String(c.blockName ?? '—'),
                slot: slotLabel,
                grossWeight: weightStr,
                declaredValue: declaredStr,
                sealNumber: String(c.sealNumber ?? '—'),
                note: String(c.note ?? '—'),
                createdAt: String(c.createdAt ?? ''),
                gateOutTime: String(c.gateOutTime ?? ''),
                repairStatus: String(c.repairStatus ?? ''),
                repairDate: String(c.repairDate ?? ''),
                compensationCost: String(c.compensationCost ?? ''),
            };
        }),
        totalPages: Number(data.totalPages ?? 1),
        totalElements: Number(data.totalElements ?? content.length),
    };
}

export async function fetchStatusHistory(containerCode: string): Promise<StatusHistoryEntry[]> {
    const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerCode)}/status-history`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json: Rec = await res.json();
    const data: unknown = json.data ?? json;
    const list: Rec[] = Array.isArray(data) ? data : [];
    return list.map((h: Rec) => ({
        status: String(h.statusName ?? h.status ?? ''),
        changedAt: String(h.changedAt ?? h.timestamp ?? h.date ?? ''),
        note: String(h.note ?? h.description ?? ''),
    }));
}

export interface DamageDetailsPayload {
    repairStatus?: string;
    repairDate?: string;
    compensationCost?: number;
}

export async function updateDamageDetails(
    containerId: string,
    payload: DamageDetailsPayload,
): Promise<Container> {
    const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerId)}/damage-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: Rec = await res.json();
    const c: Rec = json.data ?? json;
    return c as unknown as Container;
}

export async function markRepaired(containerId: string): Promise<Container> {
    const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerId)}/repair`, {
        method: 'PUT',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: Rec = await res.json();
    const c: Rec = json.data ?? json;
    return c as unknown as Container;
}
