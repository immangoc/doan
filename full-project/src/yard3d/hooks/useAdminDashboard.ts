/**
 * Fetches the full admin dashboard data from GET /admin/dashboard.
 * Returns KPI metrics + zone occupancy for the dashboard overview page.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface KpiData {
  containersInYard:  number;
  totalContainers:   number;
  gateInToday:       number;
  gateOutToday:      number;
  overdueContainers: number;
  pendingOrders:     number;
  totalOrders:       number;
  openAlerts:        number;
  criticalAlerts:    number;
  containersByStatus: { name: string; count: number }[];
}

export interface ZoneOccupancy {
  zoneId:        number;
  zoneName:      string;
  yardName:      string;
  yardType:      string;
  capacitySlots: number;
  occupiedSlots: number;
  occupancyRate: number; // 0-1
}

export interface AdminDashboardData {
  kpi:            KpiData;
  zoneOccupancy:  ZoneOccupancy[];
}

const EMPTY: AdminDashboardData = {
  kpi: {
    containersInYard: 0, totalContainers: 0,
    gateInToday: 0,      gateOutToday: 0,
    overdueContainers: 0,
    pendingOrders: 0,    totalOrders: 0,
    openAlerts: 0,       criticalAlerts: 0,
    containersByStatus: [],
  },
  zoneOccupancy: [],
};

export interface AdminDashboardResult {
  data:    AdminDashboardData;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useAdminDashboard(): AdminDashboardResult {
  const [data,    setData]    = useState<AdminDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch('/admin/dashboard')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const d: Rec = json.data ?? json;

        const kpi: KpiData = {
          containersInYard:  Number(d.containersInYard  ?? 0),
          totalContainers:   Number(d.totalContainers   ?? 0),
          gateInToday:       Number(d.gateInToday       ?? 0),
          gateOutToday:      Number(d.gateOutToday      ?? 0),
          overdueContainers: Number(d.overdueContainers ?? 0),
          pendingOrders:     Number(d.pendingOrders     ?? 0),
          totalOrders:       Number(d.totalOrders       ?? 0),
          openAlerts:        Number(d.openAlerts        ?? 0),
          criticalAlerts:    Number(d.criticalAlerts    ?? 0),
          containersByStatus: Array.isArray(d.containersByStatus)
            ? (d.containersByStatus as Rec[]).map((s) => ({
                name:  String(s.statusName ?? s.status ?? s.name ?? ''),
                count: Number(s.count ?? 0),
              }))
            : [],
        };

        const zoneOccupancy: ZoneOccupancy[] = Array.isArray(d.zoneOccupancy)
          ? (d.zoneOccupancy as Rec[]).map((z) => ({
              zoneId:        Number(z.zoneId        ?? 0),
              zoneName:      String(z.zoneName      ?? ''),
              yardName:      String(z.yardName      ?? ''),
              yardType:      String(z.yardType      ?? ''),
              capacitySlots: Number(z.capacitySlots ?? 0),
              occupiedSlots: Number(z.occupiedSlots ?? 0),
              occupancyRate: Number(z.occupancyRate ?? 0),
            }))
          : [];

        if (!cancelled) setData({ kpi, zoneOccupancy });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, error, refetch };
}
