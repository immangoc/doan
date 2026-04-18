import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/apiClient';
import { WAREHOUSES, WH_STATS } from '../data/warehouse';
import type { WHType, WHStat } from '../data/warehouse';
import { getYardData, getZoneNames, getZoneTotalSlots } from '../store/yardStore';
import { getOccupancyData, countOccupiedZoneSlots, isOccupancyFetched } from '../store/occupancyStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZoneItem = Record<string, any>;

/** Infer the WHType from a zone occupancy item returned by the backend. */
function inferWHType(item: ZoneItem): WHType {
  const type = String(item.yardType ?? item.type ?? '').toLowerCase();
  const name = String(item.yardName ?? item.yardTypeName ?? item.name ?? '').toLowerCase();
  if (type === 'cold'    || name.includes('lạnh'))  return 'cold';
  if (type === 'dry'     || name.includes('khô'))   return 'dry';
  if (type === 'fragile' || name.includes('vỡ'))    return 'fragile';
  if (type === 'damaged' || name.includes('hỏng'))  return 'damaged';
  return 'other';
}

/** Aggregate zone-level data from backend into 4 WHStat entries. */
function mapZonesToStats(zones: ZoneItem[]): WHStat[] {
  const agg: Record<WHType, { total: number; occupied: number }> = {
    cold:    { total: 0, occupied: 0 },
    dry:     { total: 0, occupied: 0 },
    fragile: { total: 0, occupied: 0 },
    damaged: { total: 0, occupied: 0 },
    other:   { total: 0, occupied: 0 },
  };

  for (const z of zones) {
    const whType   = inferWHType(z);
    const total    = Number(z.capacitySlots ?? z.totalSlots ?? z.capacity ?? z.total ?? 0);
    const occupied = Number(z.occupiedSlots ?? z.occupied    ?? z.usedSlots ?? 0);
    agg[whType].total    += total;
    agg[whType].occupied += occupied;
  }

  const allYards = getYardData();
  
  return WAREHOUSES.map((wh) => {
    let { total, occupied } = agg[wh.id];
    
    // Calculate total capacity based on real physical grid for ALL warehouses to enforce 100% UI consistency
    total = 0;
    const zonesForWh = getZoneNames(allYards, wh.id);
    for (const zName of zonesForWh) {
      total += getZoneTotalSlots(allYards, wh.id, zName);
    }

    // We keep total capacity based on real physical grid definitions 
    // to strictly enforce 100% UI consistency.
    // However, for 'occupied', we trust the backend's /admin/dashboard API counts directly
    // since the spatial 3D map may miss containers that lack a valid slotId.
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return {
      id:      wh.id,
      name:    wh.name,
      color:   wh.color,
      bgColor: wh.bgColor,
      pct:     `${pct}%`,
      empty:   Math.max(0, total - Math.max(0, occupied)),
    };
  });
}

export interface DashboardStatsResult {
  stats:   WHStat[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

/**
 * Fetches GET /admin/dashboard and maps zoneOccupancy → 4 WHStat entries.
 * Falls back to WH_STATS (mock) on error or empty response.
 */
export function useDashboardStats(): DashboardStatsResult {
  // Initialise with mock so the UI is never empty
  const [stats,   setStats]   = useState<WHStat[]>(WH_STATS);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch('/admin/dashboard')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Handle both { data: ... } wrapper and bare response
        const data = json.data ?? json;
        const zones: ZoneItem[] = data.zoneOccupancy ?? data.zones ?? [];
        if (!cancelled && zones.length > 0) {
          setStats(mapZonesToStats(zones));
        }
        // If zones is empty, keep the WH_STATS fallback already in state
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
        // stats stays as WH_STATS fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { stats, loading, error, refetch };
}
