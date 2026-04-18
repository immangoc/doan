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
  level: AlertLevel;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await apiFetch('/admin/alerts');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const data: unknown = json.data ?? json;
  const list: Rec[] = Array.isArray(data)
    ? data
    : Array.isArray((data as Rec).content) ? (data as Rec).content : [];

  return list.map((a: Rec) => ({
    alertId:      Number(a.alertId ?? a.id ?? 0),
    zoneName:     String(a.zoneName ?? a.zone ?? '—'),
    level:        (String(a.level ?? a.severity ?? 'INFO').toUpperCase()) as AlertLevel,
    message:      String(a.message ?? a.description ?? ''),
    timestamp:    String(a.timestamp ?? a.createdAt ?? a.date ?? ''),
    acknowledged: Boolean(a.acknowledged ?? a.isAcknowledged ?? false),
  }));
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
  const res = await apiFetch(`/admin/alerts/${alertId}/acknowledge`, { method: 'PUT' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
