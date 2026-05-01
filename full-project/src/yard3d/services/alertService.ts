/**
 * Phase 7 — Alerts & Incidents (KiemSoat screen).
 * fetchAlerts():       GET /admin/alerts
 * acknowledgeAlert():  PUT /admin/alerts/{id}/acknowledge
 */
import { apiFetch } from './apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  alertId: number;
  zoneName: string;
  yardName: string | null;
  level: AlertLevel;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  reportedByName: string | null;
  containerId: string | null;
}

export async function fetchAlerts(): Promise<Alert[]> {
  // Request all alerts (large page size) sorted by createdAt desc
  const res = await apiFetch('/admin/alerts?size=200&sort=createdAt,desc');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();

  // Backend returns ApiResponse<PageResponse<AlertResponse>>
  // Structure: { data: { content: [...], totalElements, ... } }
  const data: unknown = json.data ?? json;
  let list: Rec[];

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Rec;
    list = Array.isArray(obj.content) ? obj.content : [];
  } else {
    list = [];
  }

  return list.map((a: Rec) => ({
    alertId:      Number(a.alertId ?? a.id ?? 0),
    zoneName:     String(a.zoneName ?? a.zone ?? '—'),
    yardName:     a.yardName ?? null,
    // Backend field: levelName (e.g. "INFO", "WARNING", "CRITICAL")
    level:        (String(a.levelName ?? a.level ?? a.severity ?? 'INFO').toUpperCase()) as AlertLevel,
    // Backend field: description
    message:      String(a.description ?? a.message ?? ''),
    // Backend field: createdAt
    timestamp:    String(a.createdAt ?? a.timestamp ?? a.date ?? ''),
    // Backend field: status (0 = OPEN, 1 = ACKNOWLEDGED)
    acknowledged: a.status === 1 || a.status === '1' || Boolean(a.acknowledged ?? a.isAcknowledged ?? false),
    reportedByName: a.reportedByName ?? null,
    containerId:  a.containerId ?? null,
  }));
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
  const res = await apiFetch(`/admin/alerts/${alertId}/acknowledge`, { method: 'PUT' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
