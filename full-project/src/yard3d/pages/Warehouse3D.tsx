import { useState, useRef, useEffect, useSyncExternalStore, useCallback } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Compass,
  Package, Calendar, Truck, Snowflake, AlertTriangle, Layers, Info,
  Shuffle, RefreshCw, LogOut, X, FileText, LayoutDashboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WarehouseScene } from '../components/3d/WarehouseScene';
import type { SceneHandle } from '../components/3d/WarehouseScene';
import { OverviewScene } from '../components/3d/OverviewScene';
import type { OverviewSceneHandle } from '../components/3d/OverviewScene';
import { Legend } from '../components/ui/Legend';
// Phase 6: WAITING_CONTAINERS replaced by fetchWaitingContainers

import type { WHType, ZoneInfo, WHStat, PreviewPosition } from '../data/warehouse';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { cargoTypeToWHType, subscribe, getImportedContainers } from '../data/containerStore';
import type { SuggestedPosition } from '../data/containerStore';
import { fetchRecommendation, confirmGateIn, resolveYardId } from '../services/gateInService';
import type { GateInParams } from '../services/gateInService';
import { fetchAndSetOccupancy } from '../services/containerPositionService';
import { fetchAllYards, getCachedYards } from '../services/yardService';
import { processApiYards, setYardData, getSlotIdByCoords, subscribeYard, getYardData, getZoneDims, getZoneGrid } from '../store/yardStore';
import { apiFetch } from '../services/apiClient';
import { subscribeOccupancy, getOccupancyData, isOccupancyFetched } from '../store/occupancyStore';
import { fetchWaitingContainers, searchInYardContainers } from '../services/gateOutService';
import type { WaitingItem, InYardContainer } from '../services/gateOutService';
import { performGateOutForManagement, fetchGateOutInvoice } from '../services/gateOutManagementService';
import type { GateOutInvoice } from '../services/gateOutManagementService';
import { OptimizationPanel } from '../components/OptimizationPanel';
import { reportDamage } from '../services/damageService';
import { refreshDamages, markPendingOptimistic } from '../store/damageStore';
import './Warehouse3D.css';

// Phase 2: WH_TABS now comes from useDashboardStats hook inside the component

/** Mirror of yardStore.inferWHType — infers WHType from a yard/warehouse name string. */
function inferContainerWHType(yardName: string): WHType {
  const n = (yardName ?? '').toLowerCase();
  if (n.includes('lạnh')) return 'cold';
  if (n.includes('khô')) return 'dry';
  if (n.includes('vỡ') || n.includes('dễ')) return 'fragile';
  if (n.includes('hỏng')) return 'damaged';
  return 'other';
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function WHIcon({ type, size = 18 }: { type: WHType; size?: number }) {
  if (type === 'cold') return <Snowflake size={size} />;
  if (type === 'dry') return <Package size={size} />;
  if (type === 'fragile') return <AlertTriangle size={size} />;
  return <Layers size={size} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ wh }: { wh: WHStat }) {
  return (
    <div className="stat-card">
      <div className="stat-left">
        <p className="stat-name">{wh.name}</p>
        <p className="stat-pct" style={{ color: wh.color }}>{wh.pct}</p>
        <p className="stat-sub">{wh.empty} vị trí trống</p>
      </div>
      <div className="stat-icon-wrap" style={{ backgroundColor: wh.bgColor }}>
        <span style={{ color: wh.color }}><WHIcon type={wh.id} size={22} /></span>
      </div>
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r = 48, c = 2 * Math.PI * r;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#E5E7EB" strokeWidth="14" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="#1E3A8A" strokeWidth="14"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 65 65)" />
      <text x="65" y="70" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">{pct}%</text>
    </svg>
  );
}

// ─── Zone info panel ──────────────────────────────────────────────────────────
function ZoneInfoPanel({ zone }: { zone: ZoneInfo }) {
  const isWarning = zone.fillRate >= 90;

  // Use real data from store
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const occupancyLoaded = isOccupancyFetched();
  const imported = useSyncExternalStore(subscribe, getImportedContainers);

  const whTypeMap: Record<string, WHType> = {
    'Kho Lạnh': 'cold', 'Kho Khô': 'dry', 'Kho Hàng dễ vỡ': 'fragile', 'Kho Hỏng': 'damaged', 'Kho khác': 'other',
  };
  const whType = whTypeMap[zone.type];

  let cap20 = 0, cap40 = 0, filled20 = 0, filled40 = 0;

  if (whType) {
    const { rows, cols, maxTier } = getZoneDims(allYards, whType, zone.name);
    const midCol = Math.floor(cols / 2);
    const grid = getZoneGrid(allYards, whType, zone.name);
    const levels = maxTier || 3;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r]?.[c]) {
          if (c < midCol) cap20 += levels;
          else if (r % 2 === 0) cap40 += levels;
        }
      }
    }

    if (occupancyLoaded) {
      for (const [key, occ] of occupancyMap.entries()) {
        if (key.startsWith(`${whType}/${zone.name}/`)) {
          if (occ.sizeType === '40ft') filled40++; else filled20++;
        }
      }
    } else {
      filled20 = Math.round(zone.totalSlots * (zone.fillRate / 100) * 0.6);
      filled40 = Math.round(zone.totalSlots * (zone.fillRate / 100) * 0.4);
    }
  }

  const empty20 = Math.max(0, cap20 - filled20);
  const empty40 = Math.max(0, cap40 - filled40);

  // Backend recent containers
  let backendRecentCodes: string[] = [];
  if (occupancyLoaded && whType) {
    const matched = [];
    for (const [key, occ] of occupancyMap.entries()) {
      if (key.startsWith(`${whType}/${zone.name}/`)) matched.push(occ);
    }
    // Limit to 5 newest (assuming Map iteration order = insertion order = newest first from backend)
    backendRecentCodes = matched.slice(0, 5).map(c => `${c.containerCode} (T${c.tier})`);
  }

  // Client-side mock imported containers (for immediate UI response without refresh)
  const clientRecentCodes = whType
    ? imported.filter((c) => c.whType === whType && c.zone === zone.name).slice(0, 5).map(c => `${c.code} (T${c.floor})`)
    : [];

  const combinedRecentCodes = Array.from(new Set([...clientRecentCodes, ...backendRecentCodes])).slice(0, 5);
  const finalRecentCodes = combinedRecentCodes.length > 0 ? combinedRecentCodes : zone.recentContainers;

  return (
    <div className="w3d-right-panel">
      <div className="rp-zone-header">
        <h2 className="rp-zone-name">{zone.name}</h2>
        <p className="rp-zone-type">{zone.type}</p>
      </div>
      {isWarning && (
        <div className="rp-warning-banner">
          <AlertTriangle size={16} />
          <span>Cảnh báo: Khu vực gần đầy ({zone.fillRate}%)</span>
        </div>
      )}
      <div className="rp-section-label">Tỷ lệ lấp đầy</div>
      <div className="rp-donut-wrap"><DonutChart pct={zone.fillRate} /></div>
      <p className="rp-stat">Số vị trí trống: <strong>{zone.emptySlots}/{zone.totalSlots}</strong></p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 20px', fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', marginBottom: '15px' }}>
        <span>20ft trống: <strong>{empty20}</strong> vị trí</span>
        <span>40ft trống: <strong>{empty40}</strong> vị trí</span>
      </div>
      <div className="rp-section-label rp-mt">Danh sách Container nhập gần đây:</div>
      <ul className="rp-container-list">
        {finalRecentCodes.length > 0
          ? finalRecentCodes.map((c) => <li key={c}>{c}</li>)
          : <li style={{ color: '#9CA3AF', fontSize: '12px' }}>Chưa có container nhập gần đây</li>
        }
      </ul>
    </div>
  );
}

// ─── Waiting list panel ───────────────────────────────────────────────────────
/**
 * Helper: convert a WaitingItem.orderDate (rendered as dd/MM/yyyy) back to ISO yyyy-MM-dd
 * so we can compare to <input type="date"> values without locale surprises.
 */
function orderDateISO(item: WaitingItem): string {
  if (!item.orderDate) return '';
  const m = item.orderDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Already ISO or unknown — just return as-is.
  return item.orderDate;
}

function WaitingListPanel({ onClose, onSelect, refreshKey }: {
  onClose: () => void;
  onSelect: (item: WaitingItem) => void;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchWaitingContainers()
      .then((data) => setItems(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = items.filter((it) => {
    const k = search.trim().toLowerCase();
    if (k) {
      const hay = `${it.orderId} ${it.containerCode} ${it.customerName}`.toLowerCase();
      if (!hay.includes(k)) return false;
    }
    if (filterDate) {
      const iso = orderDateISO(it);
      if (iso !== filterDate) return false;
    }
    return true;
  });

  return (
    <div className="w3d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">
          Container chờ nhập
          <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
            ({filtered.length}{filtered.length !== items.length ? ` / ${items.length}` : ''})
          </span>
        </h2>
      </div>
      <div className="rp-import-body">
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Tìm mã đơn / mã container..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Calendar size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.7rem' }}
              title="Xóa lọc ngày"
            >✕</button>
          )}
        </div>
        {loading && <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Đang tải...</p>}
        {error && <p style={{ fontSize: '0.8rem', color: '#f87171', textAlign: 'center', padding: '1rem 0' }}>{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>
            {items.length === 0 ? 'Không có container đang chờ.' : 'Không có kết quả phù hợp.'}
          </p>
        )}
        {/* Show max 4 cards before scroll — each card ~88px tall + 8px gap */}
        <div style={{ maxHeight: 4 * 96, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
          {filtered.map((ctn) => (
            <button
              key={`${ctn.orderId}-${ctn.containerCode}`}
              className="waiting-item"
              onClick={() => onSelect(ctn)}
            >
              <div className="waiting-icon"><Truck size={18} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span className="waiting-code">{ctn.containerCode || `Order #${ctn.orderId}`}</span>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                  Đơn #{ctn.orderId}{ctn.orderDate ? ` · ${ctn.orderDate}` : ''}
                </div>
                {(ctn.cargoType || ctn.containerType) && (
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                    {[ctn.cargoType, ctn.containerType].filter(Boolean).join(' · ')}
                    {ctn.weight ? ` · ${Number(ctn.weight).toLocaleString()} kg` : ''}
                  </div>
                )}
                {ctn.customerName && (
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{ctn.customerName}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Import panel ─────────────────────────────────────────────────────────────
type ImportStep = 'form' | 'suggestion' | 'manual';

/** Map a backend cargoTypeName to one of the form's dropdown values. */
function normalizeCargoType(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('lạnh')) return 'Hàng Lạnh';
  if (s.includes('vỡ') || s.includes('dễ')) return 'Hàng dễ vỡ';
  if (s.includes('hỏng')) return 'Hàng hỏng';
  return 'Hàng Khô';
}

function ImportPanel({ onClose, initialCode, initialItem, onPreviewChange, onWhTypeChange }: {
  onClose: () => void;
  initialCode?: string;
  initialItem?: WaitingItem;
  onPreviewChange: (pos: PreviewPosition | null) => void;
  onWhTypeChange?: (whType: WHType) => void;
}) {
  const [step, setStep] = useState<ImportStep>('form');

  let defaultExportDate = initialItem?.exportDate ?? '';
  if (initialItem && !defaultExportDate) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    defaultExportDate = d.toISOString().split('T')[0];
  }

  const [form, setForm] = useState({
    containerCode: initialItem?.containerCode ?? initialCode ?? '',
    cargoType: initialItem ? normalizeCargoType(initialItem.cargoType) : 'Hàng Khô',
    sizeType: (initialItem?.containerType?.toUpperCase().includes('40') ? '40ft' : '20ft') as '20ft' | '40ft',
    weight: initialItem?.weight ?? '',
    exportDate: defaultExportDate,
    priority: 'Cao',
  });

  useEffect(() => {
    if (initialItem && initialItem.containerCode) {
      apiFetch(`/admin/containers?keyword=${encodeURIComponent(initialItem.containerCode)}&page=0&size=1`)
        .then(res => res.json())
        .then(json => {
          const data = json.data ?? json;
          const content = Array.isArray(data) ? data : (data.content ?? []);
          if (content.length > 0) {
            const container = content[0];
            setForm(f => {
              const updates = { ...f };
              if (!initialItem.weight && container.grossWeight != null) {
                updates.weight = `${container.grossWeight} kg`;
              }
              const cType = container.cargoTypeName ?? container.cargoType ?? container.type;
              if (cType) updates.cargoType = normalizeCargoType(String(cType));
              
              const sType = container.containerTypeName ?? container.containerType ?? container.sizeType;
              if (sType) updates.sizeType = String(sType).toUpperCase().includes('40') ? '40ft' : '20ft';
              
              return updates;
            });
          }
        })
        .catch(() => {});
    }
  }, [initialItem]);

  const [suggestion, setSuggestion] = useState<SuggestedPosition | null>(null);
  const [manualZone, setManualZone] = useState('Zone A');
  const [manualWarehouse, setManualWH] = useState('Kho hàng khô');
  const [manualFloor, setManualFloor] = useState('1');
  const [manualRow, setManualRow] = useState('1');
  const [manualCol, setManualCol] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline waiting list
  const [waitingItems, setWaitingItems] = useState<WaitingItem[]>([]);
  const [waitingLoading, setWaitingLoading] = useState(!initialItem);
  const [waitingSearch, setWaitingSearch] = useState('');
  const [waitingDateFilter, setWaitingDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WaitingItem | null>(initialItem ?? null);

  useEffect(() => {
    if (initialItem) return;
    let cancelled = false;
    setWaitingLoading(true);
    fetchWaitingContainers()
      .then((list) => { if (!cancelled) setWaitingItems(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setWaitingLoading(false); });
    return () => { cancelled = true; };
  }, [initialItem]);

  function pickOrder(item: WaitingItem) {
    setSelectedOrder(item);

    let finalExportDate = item.exportDate ?? '';
    if (!finalExportDate) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      finalExportDate = d.toISOString().split('T')[0];
    }

    setForm({
      containerCode: item.containerCode,
      cargoType: normalizeCargoType(item.cargoType),
      sizeType: (item.containerType ?? '').toUpperCase().includes('40') ? '40ft' : '20ft',
      weight: item.weight,
      exportDate: finalExportDate,
      priority: 'Cao',
    });

    if (item.containerCode) {
      apiFetch(`/admin/containers?keyword=${encodeURIComponent(item.containerCode)}&page=0&size=1`)
        .then(res => res.json())
        .then(json => {
          const data = json.data ?? json;
          const content = Array.isArray(data) ? data : (data.content ?? []);
          if (content.length > 0) {
            const container = content[0];
            setForm(f => {
              const updates = { ...f };
              if (!item.weight && container.grossWeight != null) {
                updates.weight = `${container.grossWeight} kg`;
              }
              const cType = container.cargoTypeName ?? container.cargoType ?? container.type;
              if (cType) updates.cargoType = normalizeCargoType(String(cType));
              
              const sType = container.containerTypeName ?? container.containerType ?? container.sizeType;
              if (sType) updates.sizeType = String(sType).toUpperCase().includes('40') ? '40ft' : '20ft';
              
              return updates;
            });
          }
        })
        .catch(() => {});
    }
  }

  useEffect(() => {
    return () => onPreviewChange(null);
  }, [onPreviewChange]);

  // Phase 5: fetch recommendation from POST /admin/optimization/recommend
  async function handleGetSuggestion() {
    // Validate weight before hitting the backend. Backend caps a single
    // container at MAX_STACK_WEIGHT_TONS (60t). Real 20ft ≤ 30t, 40ft ≤ 32.5t.
    const weightKg = parseFloat(form.weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setError('Vui lòng nhập trọng lượng (kg) hợp lệ, ví dụ: 25000');
      return;
    }
    const maxKg = form.sizeType === '40ft' ? 32500 : 30000;
    if (weightKg > maxKg) {
      setError(`Trọng lượng vượt quá tải tối đa của container ${form.sizeType} (${maxKg.toLocaleString()} kg). Bạn nhập ${weightKg.toLocaleString()} kg.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sug = await fetchRecommendation(form.cargoType, form.weight, form.sizeType);
      setSuggestion(sug);
      setStep('suggestion');
      if (sug) {
        setManualZone(sug.zone);
        setManualWH(sug.whName);
        setManualFloor(String(sug.floor));
        setManualRow(String(sug.row + 1));
        setManualCol(String(sug.col + 1));
        onPreviewChange({
          whType: sug.whType,
          zone: sug.zone,
          floor: sug.floor,
          row: sug.row,
          col: sug.col,
          sizeType: sug.sizeType,
          containerCode: form.containerCode || 'Container mới',
        });
        // Auto-switch warehouse tab so the ghost is visible immediately
        onWhTypeChange?.(sug.whType);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi kết nối');
      setStep('suggestion');
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  }

  // Phase 5 (fixed): gate-in → create container if needed → assign position
  async function handleConfirmImport() {
    const slotId = suggestion?.slotId;
    if (!slotId) {
      setError('Vui lòng lấy gợi ý vị trí trước khi xác nhận nhập kho');
      return;
    }

    setLoading(true);
    setError(null);

    const floor = step === 'manual' ? parseInt(manualFloor) : (suggestion?.floor ?? 1);
    const yardId = resolveYardId(suggestion?.whName ?? manualWarehouse, suggestion?.whType ?? '');

    const params: GateInParams = {
      containerCode: form.containerCode,
      cargoType: form.cargoType,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      weight: form.weight,
      exportDate: form.exportDate,
      priority: form.priority,
      yardId,
      slotId,
      tier: floor,
      skipContainerCheck: !!selectedOrder,  // container from waiting list already exists
    };

    try {
      await confirmGateIn(params);
      onPreviewChange(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nhập kho thất bại');
      setLoading(false);
    }
  }

  function handleManualPositionChange(newZone: string, newFloor: string, newWH: string, newRowStr: string, newColStr: string) {
    const whType = cargoTypeToWHType(newWH === 'Kho hàng lạnh' ? 'Hàng Lạnh'
      : newWH === 'Kho hàng dễ vỡ' ? 'Hàng dễ vỡ'
        : newWH === 'Kho hỏng' ? 'Hàng hỏng'
          : newWH === 'Kho khác' ? 'Khác' : 'Hàng Khô');
    const floor = parseInt(newFloor);
    const row = parseInt(newRowStr) - 1;
    let col = parseInt(newColStr) - 1;
    
    // 40ft must be placed in right half (cols 4-7)
    if (form.sizeType === '40ft' && col < 4) {
      col = 4;
      setManualCol('5');
    }

    // Resolve new slotId for the updated zone/warehouse/floor
    const newSlotId = getSlotIdByCoords(getCachedYards(), whType, newZone, floor, row, col);
    setSuggestion((prev) => prev
      ? { ...prev, whType, whName: newWH, zone: newZone, floor, row, col, slotId: newSlotId, slot: `R${row+1}C${col+1}` }
      : { whType, whName: newWH, zone: newZone, floor, row, col, slotId: newSlotId, slot: `R${row+1}C${col+1}`, sizeType: form.sizeType, confidence: 100 }
    );

    onPreviewChange({
      whType,
      zone: newZone,
      floor,
      row,
      col,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      containerCode: form.containerCode || 'Container mới',
    });
  }

  return (
    <div className="w3d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={step === 'form' ? () => { onPreviewChange(null); onClose(); } : () => { setStep('form'); onPreviewChange(null); }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="rp-import-title">Nhập Container</h2>
      </div>
      <div className="rp-import-body">
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '6px' }}>
            {error}
          </p>
        )}
        {step === 'form' && (
          <>
            {/* Inline waiting orders list */}
            {!selectedOrder && !initialItem && (() => {
              const filteredWaiting = waitingItems.filter((item) => {
                const k = waitingSearch.trim().toLowerCase();
                if (k) {
                  const hay = `${item.orderId} ${item.containerCode} ${item.customerName}`.toLowerCase();
                  if (!hay.includes(k)) return false;
                }
                if (waitingDateFilter && orderDateISO(item) !== waitingDateFilter) return false;
                return true;
              });
              return (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#1e3a5f' }}>
                    📋 Đơn hàng chờ nhập ({waitingLoading ? '...' : `${filteredWaiting.length}${filteredWaiting.length !== waitingItems.length ? `/${waitingItems.length}` : ''}`})
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="Tìm mã đơn / container..."
                      value={waitingSearch}
                      onChange={(e) => setWaitingSearch(e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.72rem' }}
                    />
                    <input
                      type="date"
                      value={waitingDateFilter}
                      onChange={(e) => setWaitingDateFilter(e.target.value)}
                      style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.72rem' }}
                    />
                  </div>
                  {waitingLoading && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Đang tải...</div>}
                  {!waitingLoading && waitingItems.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', background: '#f9fafb', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                      Không có đơn hàng nào đang chờ nhập kho.
                    </div>
                  )}
                  {!waitingLoading && waitingItems.length > 0 && filteredWaiting.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', background: '#f9fafb', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                      Không có kết quả phù hợp.
                    </div>
                  )}
                  {!waitingLoading && filteredWaiting.length > 0 && (
                    /* show 4 rows max (~40px each) before scroll */
                    <div style={{ maxHeight: 4 * 44, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {filteredWaiting.map((item) => (
                        <button
                          key={`${item.orderId}-${item.containerCode}`}
                          onClick={() => pickOrder(item)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                            padding: '0.45rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: 6,
                            background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '0.75rem',
                          }}
                        >
                          <Truck size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#1e3a5f' }}>#{item.orderId} · {item.containerCode}</div>
                            <div style={{ color: '#6b7280' }}>{item.cargoType} · {item.containerType} · 👤 {item.customerName}</div>
                          </div>
                          <ChevronRight size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0 0.25rem' }} />
                </div>
              );
            })()}

            {/* Selected order info minimal banner */}
            {selectedOrder && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#f3f4f6', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#374151' }}>Đã chọn Đơn hàng #{selectedOrder.orderId}</span>
                {!initialItem && (
                  <button
                    onClick={() => { setSelectedOrder(null); setForm({ containerCode: '', cargoType: 'Hàng Khô', sizeType: '20ft', weight: '', exportDate: '', priority: 'Cao' }); }}
                    style={{ fontSize: '0.7rem', color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                  >Bỏ chọn</button>
                )}
              </div>
            )}

            <div className="rp-field">
              <label>Mã số container</label>
              <input
                type="text"
                value={form.containerCode}
                placeholder="VD: CTN-2026-1234"
                readOnly={!!selectedOrder}
                style={selectedOrder ? { background: '#f9fafb', color: '#6b7280', cursor: 'default' } : undefined}
                onChange={(e) => { if (!selectedOrder) setForm({ ...form, containerCode: e.target.value }); }}
              />
            </div>
            <div className="rp-field">
              <label>Loại hàng</label>
              <div className="rp-select-wrap">
                <select value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Hàng hỏng</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="rp-field">
              <label>Loại container</label>
              <div className="rp-size-toggle">
                <button type="button"
                  className={`rp-size-btn ${form.sizeType === '20ft' ? 'rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '20ft' })}>
                  20ft
                </button>
                <button type="button"
                  className={`rp-size-btn ${form.sizeType === '40ft' ? 'rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '40ft' })}>
                  40ft
                </button>
              </div>
            </div>
            <div className="rp-field">
              <label>Trọng lượng (kg)</label>
              <input
                type="number"
                min={1}
                max={form.sizeType === '40ft' ? 32500 : 30000}
                step={100}
                value={form.weight}
                placeholder={form.sizeType === '40ft' ? 'Tối đa 32500' : 'Tối đa 30000'}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="rp-field">
              <label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="rp-field">
              <label>Mức độ ưu tiên</label>
              <div className="rp-select-wrap">
                <select value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Cao</option><option>Trung bình</option><option>Thấp</option>
                </select>
              </div>
            </div>
            <button className="btn-primary rp-submit-btn" onClick={handleGetSuggestion} disabled={loading}>
              {loading ? 'Đang tải...' : 'Nhận gợi ý vị trí'}
            </button>
          </>
        )}

        {(step === 'suggestion' || step === 'manual') && (
          <>
            <div className="rp-suggestion-card">
              <div className="rp-sug-header">
                <div className="rp-sug-icon"><Info size={16} /></div>
                <span className="rp-sug-title">Gợi ý vị trí</span>
              </div>
              {suggestion ? (
                <>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Vị trí</span>
                    <span className="rp-sug-value rp-blue">{suggestion.zone} - {suggestion.whName}<br />Tầng {suggestion.floor} - {suggestion.slot}</span>
                  </div>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Hiệu quả tối ưu</span>
                    <span className="rp-sug-value rp-blue">{suggestion.efficiency}%</span>
                  </div>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Số Container<br />đảo chuyển</span>
                    <span className="rp-sug-value rp-blue">{suggestion.moves}</span>
                  </div>
                </>
              ) : (
                <div className="rp-sug-row">
                  <span className="rp-sug-label">Không tìm thấy vị trí trống</span>
                </div>
              )}
            </div>

            {step === 'suggestion' && (
              <>
                <button className="btn-primary rp-submit-btn" onClick={handleConfirmImport} disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận nhập'}
                </button>
                <button className="rp-cancel-link" disabled={loading} onClick={() => setStep('manual')}>Điều chỉnh thủ công</button>
                <button className="rp-cancel-link" disabled={loading} onClick={() => { onPreviewChange(null); onClose(); }}>Hủy</button>
              </>
            )}

            {step === 'manual' && (
              <>
                <div className="rp-manual-title">Điều chỉnh vị trí thủ công</div>
                {[
                  { label: 'Khu nhập', value: manualZone, setter: (v: string) => { setManualZone(v); handleManualPositionChange(v, manualFloor, manualWarehouse, manualRow, manualCol); }, options: manualWarehouse === 'Kho hỏng' ? ['Zone A', 'Zone B'] : ['Zone A', 'Zone B', 'Zone C'] },
                  { label: 'Kho nhập', value: manualWarehouse, setter: (v: string) => { setManualWH(v); handleManualPositionChange(manualZone, manualFloor, v, manualRow, manualCol); }, options: ['Kho hàng khô', 'Kho hàng lạnh', 'Kho hàng dễ vỡ', 'Kho hỏng', 'Kho khác'] },
                  { label: 'Tầng', value: manualFloor, setter: (v: string) => { setManualFloor(v); handleManualPositionChange(manualZone, v, manualWarehouse, manualRow, manualCol); }, options: ['1', '2', '3', '4'] },
                  { label: 'Dãy (Row)', value: manualRow, setter: (v: string) => { setManualRow(v); handleManualPositionChange(manualZone, manualFloor, manualWarehouse, v, manualCol); }, options: ['1', '2', '3', '4'] },
                  { label: 'Ô (Col)', value: manualCol, setter: (v: string) => { setManualCol(v); handleManualPositionChange(manualZone, manualFloor, manualWarehouse, manualRow, v); }, options: form.sizeType === '40ft' ? ['5', '6', '7', '8'] : ['1', '2', '3', '4', '5', '6', '7', '8'] },
                ].map(({ label, value, setter, options }) => (
                  <div key={label} className="rp-field">
                    <label>{label}</label>
                    <div className="rp-select-wrap">
                      <select value={value} onChange={(e) => setter(e.target.value)}>
                        {options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button className="btn-primary rp-submit-btn" onClick={handleConfirmImport} disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận nhập'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Map WHType → Vietnamese warehouse name prefix (for filtering)
const WH_NAME_MAP: Record<WHType, string> = {
  cold: 'Kho hàng lạnh',
  dry: 'Kho hàng khô',
  fragile: 'Kho hàng dễ vỡ',
  damaged: 'Kho hỏng',
  other: 'Kho khác',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// ─── Export panel ────────────────────────────────────────────────────────────
function ExportPanel({ onClose, onDone, warehouseType }: {
  onClose: () => void;
  onDone: () => void;
  warehouseType: WHType;
}) {
  const [keyword, setKeyword] = useState('');
  const [filterExitDate, setFilterExitDate] = useState('');
  const [allContainers, setAllContainers] = useState<InYardContainer[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<InYardContainer | null>(null);
  const [gateOutLoading, setGateOutLoading] = useState(false);
  const [gateOutError, setGateOutError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<GateOutInvoice | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Default: only show containers due today or already overdue (expectedExitDate <= today).
  // User can toggle "showAll" to see every IN_YARD container.
  const today = new Date().toISOString().split('T')[0];
  const containers = allContainers.filter((c) => {
    if (keyword.trim() && !(`${c.containerCode}`.toLowerCase().includes(keyword.toLowerCase()))) return false;
    if (filterExitDate && c.expectedExitDate !== filterExitDate) return false;
    if (showAll || filterExitDate) return true;
    if (!c.expectedExitDate) return false;
    return c.expectedExitDate <= today;
  });

  const whName = WH_NAME_MAP[warehouseType] ?? '';

  const load = useCallback(() => {
    setFetchLoading(true); setFetchError(null);
    searchInYardContainers('')
      .then(setAllContainers)
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setFetchLoading(false));
  }, []);

  // Always load all IN_YARD containers; filtering is done client-side
  useEffect(() => { load(); }, [load]);

  async function handleGateOut() {
    if (!confirmTarget) return;
    setGateOutLoading(true); setGateOutError(null);
    try {
      const gateOutId = await performGateOutForManagement(confirmTarget.containerId);
      setAllContainers((prev) => prev.filter((c) => c.containerId !== confirmTarget.containerId));
      setConfirmTarget(null);
      try { setInvoice(await fetchGateOutInvoice(gateOutId)); } catch { /* non-critical */ }
      onDone();
    } catch (e) {
      setGateOutError(e instanceof Error ? e.message : 'Xuất kho thất bại');
    } finally { setGateOutLoading(false); }
  }

  if (invoice) {
    return (
      <div className="w3d-right-panel">
        <div className="rp-import-header">
          <button className="rp-back-btn" onClick={() => setInvoice(null)}><ChevronLeft size={18} /></button>
          <h2 className="rp-import-title">Hóa đơn xuất kho</h2>
        </div>
        <div className="rp-import-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#16a34a', fontWeight: 600 }}>
            <FileText size={18} /> Xuất kho thành công!
          </div>
          {([
            ['Hóa đơn #', String(invoice.invoiceId), false],
            ['Mã container', invoice.containerCode, false],
            ['Loại hàng', invoice.cargoType, false],
            ['Loại container', invoice.containerType, false],
            ['Thời gian nhập', invoice.gateInTime, false],
            ['Thời gian xuất', invoice.gateOutTime, false],
            ['Số ngày lưu', `${invoice.storageDays} ngày`, false],
            ['Phí / ngày', invoice.feePerDay, false],
            ['Phí cơ bản', invoice.baseFee, false],
            ...(invoice.isOverdue
              ? [[`Phí trễ hạn (${invoice.overdueDays} ngày)`, invoice.overduePenalty, false] as [string, string, boolean]]
              : []),
            ['Tổng cộng', invoice.totalAmount, true],
          ] as [string, string, boolean][]).map(([label, value, total]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: total ? '0.92rem' : '0.82rem' }}>
              <span style={{ color: total ? '#0f172a' : '#64748b', fontWeight: total ? 700 : 400 }}>{label}</span>
              <span style={{ fontWeight: total ? 800 : 600, color: total ? '#16a34a' : undefined }}>{value}</span>
            </div>
          ))}
          <button className="btn-primary rp-submit-btn" style={{ marginTop: 16 }} onClick={() => { setInvoice(null); onClose(); }}>Đóng</button>
        </div>
      </div>
    );
  }

  const dueCount = allContainers.filter((c) => c.expectedExitDate && c.expectedExitDate <= today).length;

  return (
    <div className="w3d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Xuất kho <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 400 }}>({containers.length}{showAll ? ` / ${allContainers.length}` : ` cần xuất hôm nay`})</span></h2>
      </div>
      <div className="rp-import-body">
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Tìm mã container / mã đơn..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Calendar size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            type="date"
            value={filterExitDate}
            onChange={(e) => setFilterExitDate(e.target.value)}
            placeholder="Lọc theo ngày xuất"
            style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
          {filterExitDate && (
            <button
              type="button"
              onClick={() => setFilterExitDate('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              title="Xóa lọc ngày"
            >✕</button>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#475569', marginBottom: 10, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Hiện tất cả container trong bãi ({allContainers.length})
          {!showAll && dueCount > 0 && (
            <span style={{ marginLeft: 'auto', color: '#dc2626', fontWeight: 600 }}>{dueCount} đến hạn</span>
          )}
        </label>
        {fetchLoading && <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Đang tải...</p>}
        {fetchError && <p style={{ fontSize: '0.8rem', color: '#f87171', textAlign: 'center', padding: '1rem 0' }}>{fetchError}</p>}
        {!fetchLoading && !fetchError && containers.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>
            {showAll || filterExitDate ? 'Không có container phù hợp.' : 'Hôm nay không có container nào đến hạn xuất.'}
          </p>
        )}
        <div style={{ maxHeight: 4 * 96, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {containers.map((c) => {
          const overdue = !!c.expectedExitDate && c.expectedExitDate < today;
          const dueToday = c.expectedExitDate === today;
          return (
            <button
              key={c.containerId}
              className="waiting-item"
              onClick={() => { setConfirmTarget(c); setGateOutError(null); }}
            >
              <div className="waiting-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><LogOut size={16} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span className="waiting-code">{c.containerCode}</span>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
                  {[c.cargoType, c.containerType, c.whName, c.zone].filter(Boolean).join(' · ')}
                </div>
                {c.expectedExitDate && (
                  <div style={{ fontSize: '0.7rem', marginTop: 3, color: overdue ? '#dc2626' : dueToday ? '#d97706' : '#64748b', fontWeight: overdue || dueToday ? 600 : 400 }}>
                    {overdue ? `Quá hạn từ ${c.expectedExitDate}` : dueToday ? 'Đến hạn hôm nay' : `Hạn xuất: ${c.expectedExitDate}`}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmTarget && (
        <div className="mgmt-modal-overlay" onClick={gateOutLoading ? undefined : () => setConfirmTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 300, maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Xác nhận xuất kho</h3>
              <button onClick={() => setConfirmTarget(null)} disabled={gateOutLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            {gateOutError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12 }}>{gateOutError}</p>}
            {[
              ['Mã container', confirmTarget.containerCode],
              ['Loại hàng', confirmTarget.cargoType],
              ['Loại cont.', confirmTarget.containerType],
              ['Kho', confirmTarget.whName],
              ['Zone', confirmTarget.zone],
              ['Block', confirmTarget.blockName],
              ['Vị trí', confirmTarget.slot],
            ].filter(([, v]) => v && v !== '—').map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setConfirmTarget(null)} disabled={gateOutLoading}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Hủy</button>
              <button onClick={handleGateOut} disabled={gateOutLoading}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                {gateOutLoading ? 'Đang xử lý...' : 'Xác nhận xuất'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type PanelMode = null | 'zone' | 'waiting-list' | 'import' | 'optimize' | 'export';

export function Warehouse3D() {
  const [activeWH, setActiveWH] = useState<WHType | 'overview'>('overview');
  const [panelMode, setPanelMode] = useState<PanelMode>(null);

  // Phase 2: real occupancy stats from backend
  const { stats: WH_TABS, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<WaitingItem | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const [searchNotFound, setSearchNotFound] = useState('');
  // Phase 8: source container highlight for optimization (amber glow in 3D)
  const [optimizeHighlight, setOptimizeHighlight] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waitingRefreshKey, setWaitingRefreshKey] = useState(0);
  const sceneRef = useRef<SceneHandle>(null);
  const overviewSceneRef = useRef<OverviewSceneHandle>(null);
  const navigate = useNavigate();

  async function handleDamageContainer(payload: {
    containerCode: string;
    cargoType: string;
    containerType: string;
    weight: string;
    whName: string;
    blockName: string;
    zone: string;
    slot: string;
    floor: number;
  }) {
    if (!confirm(`Báo hỏng container ${payload.containerCode}?\n\nContainer sẽ nhấp nháy vàng và xuất hiện trong "Quản lý kho hỏng" để admin xác nhận chuyển.`)) {
      return;
    }
    try {
      const report = await reportDamage({ containerId: payload.containerCode, severity: 'MAJOR' });
      markPendingOptimistic(report);
      toast.success(`Đã báo hỏng ${payload.containerCode}. Vào "Quản lý kho hỏng" để xác nhận chuyển.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Báo hỏng thất bại');
    }
  }

  function handleSearchSubmit() {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) {
      setSearchNotFound('');
      return;
    }

    const occupancyEntries = Array.from(getOccupancyData().entries());
    const occMatch = occupancyEntries.find(([, occ]) => occ.containerCode?.toLowerCase().includes(kw));

    if (!occMatch) {
      const message = `Không thấy container: ${searchTerm.trim()}`;
      setSearchNotFound(message);
      setPreviewPosition(null);
      toast.error(message);
      return;
    }

    const [slotKey, occ] = occMatch;
    const [whTypeRaw, zone, rowRaw, colRaw, tierRaw] = slotKey.split('/');
    const row = Number(rowRaw) || 0;
    const col = Number(colRaw) || 0;
    const floor = Number(tierRaw) || occ.tier || 1;

    setSearchNotFound('');
    setActiveWH(whTypeRaw as WHType);
    setPanelMode(null);
    setPreviewPosition({
      whType: whTypeRaw as WHType,
      zone,
      floor,
      row,
      col,
      sizeType: occ.sizeType,
      containerCode: occ.containerCode,
    });
    sceneRef.current?.focusOn(col * 4 + 6, row * 8 + 6);
    toast.success(`Đã tìm thấy container: ${occ.containerCode}`);
  }

  function handleZoneClick(zone: ZoneInfo) {
    setSelectedZone(zone);
    setPanelMode('zone');
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedZone(null);
    setSelectedCode(undefined);
    setSelectedItem(undefined);
    setPreviewPosition(null);
    setOptimizeHighlight(undefined);
  }

  function openWaiting() {
    setPanelMode('waiting-list');
    setSelectedZone(null);
  }

  function selectContainer(item: WaitingItem) {
    setSelectedCode(item.containerCode);
    setSelectedItem(item);
    setPanelMode('import');
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const yards = await fetchAllYards();
      setYardData(processApiYards(yards));
      await fetchAndSetOccupancy(yards);
      refreshDamages();
      refetchStats();
      if (panelMode === 'waiting-list') {
        setWaitingRefreshKey(k => k + 1);
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="w3d-page">

        {/* ── Header ── */}
        <div className="w3d-header">
          <h1 className="w3d-title">Sơ đồ 3D kho bãi trực quan</h1>
          <p className="w3d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
        </div>

        {/* ── Stat cards (Phase 2: real data from /admin/dashboard) ── */}
        <div className="w3d-stat-row" style={statsLoading ? { opacity: 0.6 } : undefined}>
          {statsError && (
            <p style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.25rem', width: '100%' }}>
              Không thể tải dữ liệu ({statsError})
            </p>
          )}
          {WH_TABS.map((wh) => <StatCard key={wh.id} wh={wh} />)}
        </div>

        {/* ── Action bar ── */}
        <div className="w3d-action-bar">
          {panelMode === null && (
            <button className="ctn-card" onClick={openWaiting}>
              <div className="ctn-card-icon"><Truck size={20} /></div>
              <div className="ctn-card-text">
                <span className="ctn-card-label">Container chờ nhập kho</span>
                <span className="ctn-card-sub">Xem danh sách chờ</span>
              </div>
              <ChevronRight size={17} className="ctn-card-chevron" />
            </button>
          )}
          <div className="w3d-spacer" />
          <div className="w3d-search">
            <Search size={15} className="w3d-search-icon" />
            <input
              type="text"
              placeholder="Nhập mã số Container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
            />
          </div>
          <button className="btn-primary w3d-import-btn" onClick={handleSearchSubmit}>
            <Search size={17} /><span>Tìm</span>
          </button>
          <button className="btn-primary w3d-import-btn" onClick={() => { setSelectedItem(undefined); setSelectedCode(undefined); setPanelMode('import'); }}>
            <Plus size={17} /><span>Nhập kho</span>
          </button>
          <button
            className="w3d-import-btn"
            style={panelMode === 'export' ? { background: '#dc2626', color: '#fff', border: '1px solid #dc2626' } : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            onClick={() => setPanelMode(panelMode === 'export' ? null : 'export')}
            title="Xuất kho container"
          >
            <LogOut size={17} /><span>Xuất kho</span>
          </button>
          <button
            className={`w3d-import-btn ${panelMode === 'optimize' ? 'btn-primary' : ''}`}
            style={panelMode !== 'optimize' ? { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' } : undefined}
            onClick={() => setPanelMode(panelMode === 'optimize' ? null : 'optimize')}
            title="Tối ưu hóa vị trí container"
          >
            <Shuffle size={17} /><span>Tối ưu</span>
          </button>
          <button
            className="w3d-import-btn"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
            onClick={() => navigate('/yard/tong-quan')}
            title="Xem tổng quan kho bãi"
          >
            <LayoutDashboard size={17} /><span>Tổng quan</span>
          </button>
          <button
            className="w3d-import-btn"
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isRefreshing ? 'refresh-spinning' : ''} /><span>Làm mới</span>
          </button>
        </div>

        {/* ── Warehouse type tabs ── */}
        <div className="w3d-wh-tabs">
          <button
            className={`w3d-wh-tab ${activeWH === 'overview' ? 'w3d-wh-tab-active' : ''}`}
            style={{ '--tab-color': '#1e3a8a' } as React.CSSProperties}
            onClick={() => setActiveWH('overview')}
          >
            <LayoutDashboard size={15} />
            <span>Tổng</span>
          </button>
          {WH_TABS.map((wh) => (
            <button
              key={wh.id}
              className={`w3d-wh-tab ${activeWH === wh.id ? 'w3d-wh-tab-active' : ''}`}
              style={{ '--tab-color': wh.color } as React.CSSProperties}
              onClick={() => setActiveWH(wh.id)}
            >
              <WHIcon type={wh.id} size={15} />
              <span>{wh.name}</span>
            </button>
          ))}
        </div>

        {searchNotFound && (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
            {searchNotFound}
          </div>
        )}

        {/* ── Content row: 3D canvas + right panel ── */}
        <div className="w3d-content-row">
          <div className="w3d-canvas-wrap">
            {activeWH === 'overview' ? (
              <OverviewScene
                ref={overviewSceneRef}
                onZoneClick={handleZoneClick}
                highlightId={searchTerm.trim() || optimizeHighlight}
                previewPosition={previewPosition}
                onDamageContainer={handleDamageContainer}
              />
            ) : (
              <WarehouseScene
                ref={sceneRef}
                warehouseType={activeWH}
                onZoneClick={handleZoneClick}
                highlightId={searchTerm.trim() || optimizeHighlight}
                previewPosition={previewPosition}
                onDamageContainer={handleDamageContainer}
              />
            )}
            <div className="w3d-controls">
              <button className="ctrl-btn" aria-label="Zoom in" onClick={() => activeWH === 'overview' ? overviewSceneRef.current?.zoomIn() : sceneRef.current?.zoomIn()}>   <ZoomIn size={18} /></button>
              <button className="ctrl-btn" aria-label="Zoom out" onClick={() => activeWH === 'overview' ? overviewSceneRef.current?.zoomOut() : sceneRef.current?.zoomOut()}>  <ZoomOut size={18} /></button>
              <button className="ctrl-btn ctrl-btn-primary" aria-label="Reset view" onClick={() => activeWH === 'overview' ? overviewSceneRef.current?.resetView() : sceneRef.current?.resetView()}><Compass size={18} /></button>
            </div>
          </div>

          {panelMode === 'zone' && selectedZone && <ZoneInfoPanel zone={selectedZone} />}
          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} refreshKey={waitingRefreshKey} />
          )}
          {panelMode === 'import' && (
            <ImportPanel
              onClose={closePanel}
              initialCode={selectedCode}
              initialItem={selectedItem}
              onPreviewChange={setPreviewPosition}
              onWhTypeChange={setActiveWH}
            />
          )}
          {panelMode === 'export' && (
            <ExportPanel onClose={closePanel} onDone={handleRefresh} warehouseType={activeWH === 'overview' ? 'dry' : activeWH} />
          )}
          {/* Phase 8: Optimization panel — relocate & swap */}
          {panelMode === 'optimize' && (
            <OptimizationPanel
              panelClass="w3d-right-panel"
              warehouseType={activeWH === 'overview' ? 'dry' : activeWH}
              onClose={closePanel}
              onPreviewChange={setPreviewPosition}
              onSourceHighlight={setOptimizeHighlight}
            />
          )}
        </div>

        {/* ── Legend ── */}
        <div className="w3d-legend-row"><Legend /></div>
      </div>

    </DashboardLayout>
  );
}
