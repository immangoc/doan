import { apiFetch } from './apiClient';

// ─── Raw API types (backend response shapes) ──────────────────────────────────

export interface ApiSlot {
  slotId: number;
  rowNo: number;
  bayNo: number;
  maxTier: number;
  isLocked?: boolean;
  lockReason?: string;
}

export interface ApiBlock {
  blockId: number;
  blockName: string;
  blockType: string;
  slots: ApiSlot[];
}

export interface ApiZone {
  zoneId: number;
  zoneName: string;
  blocks: ApiBlock[];
  isLocked?: boolean;
}

export interface ApiYard {
  yardId: number;
  yardName: string;
  yardType: string; // e.g. 'cold' | 'dry' | 'fragile' | 'other' or Vietnamese name
  zones: ApiZone[];
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

/** Fetch a list endpoint, handling both paginated {content:[]} and plain [] responses. */
async function fetchList(path: string): Promise<Rec[]> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await apiFetch(`${path}${sep}size=200`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`);
  const json: Rec = await res.json();
  const data: unknown = json.data ?? json;
  if (Array.isArray(data)) return data as Rec[];
  const paged = data as Rec;
  return Array.isArray(paged.content) ? (paged.content as Rec[]) : [];
}

/** Safely read a number field, with several fallback keys. */
function num(rec: Rec, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = Number(rec[k]);
    if (!isNaN(v) && rec[k] != null) return v;
  }
  return fallback;
}

/** Safely read a string field, with several fallback keys. */
function str(rec: Rec, keys: string[], fallback: string): string {
  for (const k of keys) {
    if (rec[k] != null && rec[k] !== '') return String(rec[k]);
  }
  return fallback;
}

/**
 * Extract a type name from a field that may be:
 *  - a plain string: "cold"
 *  - an object: { typeName: "Cold Storage" }
 *  - an object: { yardTypeName: "cold" }
 */
function typeName(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const o = value as Rec;
    return String(o.typeName ?? o.yardTypeName ?? o.blockTypeName ?? '');
  }
  return '';
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

// ─── Raw yards cache (Phase 5: needed by gateInService for occupancy refresh) ─

let _cachedYards: ApiYard[] = [];

/** Returns the last successful result of fetchAllYards(). Empty array until first load. */
export function getCachedYards(): ApiYard[] {
  return _cachedYards;
}

/**
 * Fetches the full yard hierarchy:
 * GET /admin/yards
 *   └─ GET /admin/yards/{id}/zones
 *         └─ GET /admin/zones/{id}/blocks
 *               └─ GET /admin/blocks/{id}/slots
 *
 * This is sequential by necessity (each level needs IDs from the level above).
 * Phase 4 will replace the slot list with a bulk occupancy endpoint.
 */
export async function fetchAllYards(): Promise<ApiYard[]> {
  const yardsRaw = await fetchList('/admin/yards');
  const result: ApiYard[] = [];

  for (const yard of yardsRaw) {
    const yardId  = num(yard, ['yardId', 'id']);
    const yardName = str(yard, ['yardName', 'name'], `Yard ${yardId}`);
    const yardTypeRaw = yard.yardType ?? yard.type ?? '';
    const yardTypeStr = typeName(yardTypeRaw) || str(yard, ['yardTypeName'], 'other');
    const isDamaged = yardTypeStr.includes('hỏng') || yardTypeStr.includes('damaged') || str(yard, ['yardName', 'name'], '').toLowerCase().includes('hỏng');
    const expectedZones = isDamaged ? 2 : 3;

    const zonesRaw = await fetchList(`/admin/yards/${yardId}/zones`);
    const zones: ApiZone[] = [];

    // Force exactly N zones (3 for normal, 2 for damaged) to keep the 3D map layout consistent
    for (let i = 0; i < expectedZones; i++) {
      const zone = zonesRaw[i];
      const zoneName = `Zone ${String.fromCharCode(65 + i)}`;

      if (zone) {
        const zoneId   = num(zone, ['zoneId', 'id']);

        const blocksRaw = await fetchList(`/admin/zones/${zoneId}/blocks`);
        const blocks: ApiBlock[] = [];

        for (const block of blocksRaw) {
          const blockId   = num(block, ['blockId', 'id']);
          const blockName = str(block, ['blockName', 'name'], `Block ${blockId}`);
          const blockTypeRaw  = block.blockType ?? block.type ?? '';
          const blockTypeStr  = typeName(blockTypeRaw) || str(block, ['blockTypeName'], 'standard');

          const slotsRaw = await fetchList(`/admin/blocks/${blockId}/slots`);
          const slots: ApiSlot[] = slotsRaw.map((s: Rec) => ({
            slotId:  num(s, ['slotId', 'id']),
            rowNo:   num(s, ['rowNo', 'row'], 1),
            bayNo:   num(s, ['bayNo', 'bay', 'col'], 1),
            maxTier: isDamaged ? 1 : num(s, ['maxTier', 'tier', 'max_tier'], 4),
            isLocked: s.isLocked === true || s.locked === true,
            lockReason: s.lockReason || s.lock_reason || undefined,
          }));

          blocks.push({ blockId, blockName, blockType: blockTypeStr, slots });
        }

        zones.push({ zoneId, zoneName, blocks, isLocked: zone.isLocked === true });
      } else {
        zones.push({ zoneId: -(i + 1), zoneName, blocks: [] });
      }
    }

    result.push({ yardId, yardName, yardType: yardTypeStr, zones });
  }

  _cachedYards = result;
  return result;
}
