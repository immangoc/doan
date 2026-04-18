import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ChevronDown,
  Snowflake, Package, AlertTriangle, Layers,
  Thermometer, Truck, Calendar, Info, X, RefreshCw, LogOut, FileText,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  WAREHOUSES,
  // Phase 3: ZONES, getGridForFloor replaced by yardStore
  // WH_STATS: Phase 2 — replaced by useDashboardStats hook
  // Phase 6: WAITING_CONTAINERS replaced by fetchWaitingContainers
  getSlotInfo,
} from '../data/warehouse';
import type { WHType, WHConfig, WHStat, SlotInfo, PreviewPosition } from '../data/warehouse';
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
  subscribeYard, getYardData, getZoneNames, getZoneGrid, getZoneGridForFloor, getSlotIdByCoords,
} from '../store/yardStore';
import {
  subscribeOccupancy, getOccupancyData, getOccupancyBoolGrid, makeSlotKey, isOccupancyFetched
} from '../store/occupancyStore';
import type { OccupancyMap } from '../store/occupancyStore';
import {
  cargoTypeToWHType, cargoTypeToWHName,
} from '../data/containerStore';
import type { SuggestedPosition } from '../data/containerStore';
import { fetchRecommendation, confirmGateIn, resolveYardId } from '../services/gateInService';
import type { GateInParams } from '../services/gateInService';
import { fetchAndSetOccupancy } from '../services/containerPositionService';
import { fetchAllYards, getCachedYards } from '../services/yardService';
import { fetchWaitingContainers, searchInYardContainers } from '../services/gateOutService';
import type { WaitingItem, InYardContainer } from '../services/gateOutService';
import { performGateOutForManagement, fetchGateOutInvoice } from '../services/gateOutManagementService';
import type { GateOutInvoice } from '../services/gateOutManagementService';
import './Warehouse2D.css';

// ─── Slot with tooltip ──────────────────────────────────────────────────────
function Slot({ info, color, emptyColor, isHL, isGhost, onClickSlot }: {
  info: SlotInfo;
  color: string;
  emptyColor: string;
  isHL: boolean;
  isGhost?: boolean;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="slot-wrapper">
      <div
        className={`slot ${info.type === '40ft' ? 'slot-40' : 'slot-20'} ${info.filled ? 'slot-filled' : 'slot-empty'} ${isHL ? 'slot-hl' : ''} ${isGhost ? 'slot-ghost' : ''}`}
        style={{
          backgroundColor: isGhost ? `${color}30` : isHL ? `${color}20` : info.filled ? color : emptyColor,
          borderColor: isGhost ? color : isHL ? color : 'transparent',
          color: info.filled ? '#fff' : color,
          borderWidth: isGhost ? '2px' : undefined,
          borderStyle: isGhost ? 'dashed' : undefined,
          animation: isGhost ? 'ghostPulse 1.5s ease-in-out infinite' : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClickSlot?.(info)}
      >
        {isGhost ? '⬚' : info.label}
      </div>
      {hovered && info.filled && !isGhost && (
        <div className="slot-tooltip">
          <div className="slot-tooltip-row"><strong>{info.cargo}</strong></div>
          <div className="slot-tooltip-row">{info.weight} · {info.temp}</div>
          <div className="slot-tooltip-row">{info.type} container</div>
        </div>
      )}
      {hovered && isGhost && (
        <div className="slot-tooltip">
          <div className="slot-tooltip-row"><strong>Vị trí gợi ý</strong></div>
          <div className="slot-tooltip-row">Container sẽ được đặt tại đây</div>
        </div>
      )}
    </div>
  );
}

// ─── Rack rendering ──────────────────────────────────────────────────────────
function Rack({ rows, colStart, color, emptyColor, highlighted, ghostPos, is40ft, seedBase, onClickSlot, occupancyMap, whType, zoneName, floor, baseRow, occupancyLoaded, searchTerm }: {
  rows: boolean[][];
  colStart: number;
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  is40ft: boolean;
  seedBase: number;
  onClickSlot?: (info: SlotInfo) => void;
  occupancyMap?: OccupancyMap;
  whType?: string;
  zoneName?: string;
  floor?: number;
  baseRow?: number;
  occupancyLoaded?: boolean;
  searchTerm?: string;
}) {
  const getSlotDetails = (ri: number, ci: number, is40ftSlot: boolean, filledSlot: boolean, seed: number) => {
    const realRow = baseRow !== undefined ? baseRow + ri : ri;
    if (occupancyLoaded && occupancyMap && whType && zoneName && floor) {
      if (!filledSlot) return { filled: false, label: `F${floor}-R${realRow + 1}C${ci + 1}`, type: is40ftSlot ? '40ft' : '20ft', row: realRow, col: ci, floor } as SlotInfo;
      const key = makeSlotKey(whType, zoneName, realRow, ci, floor);
      const occ = occupancyMap.get(key);
      if (occ) {
        return {
          filled: true,
          label: occ.containerCode,
          type: is40ftSlot ? '40ft' : '20ft', // Enforce structural grid constraint visually
          originalType: occ.sizeType, // Preserve actual size for modal
          cargo: occ.cargoType,
          weight: occ.weight,
          temp: occ.cargoType?.toLowerCase().includes('lạnh') ? '18°C' : 'Môi trường',
        } as SlotInfo;
      }
      return { filled: false, label: `F${floor}-R${realRow + 1}C${ci + 1}`, type: is40ftSlot ? '40ft' : '20ft', row: realRow, col: ci, floor } as SlotInfo;
    }
    const info = getSlotInfo(filledSlot, is40ftSlot, seed);
    info.row = realRow;
    info.col = ci;
    info.floor = floor;
    if (occupancyLoaded && !filledSlot) {
      info.filled = false;
      info.cargo = undefined;
      info.weight = undefined;
      info.label = `F${floor}-R${realRow + 1}C${ci + 1}`;
    }
    return info;
  };

  const matchesSearch = (label?: string) =>
    !!(searchTerm && label && label.toLowerCase().includes(searchTerm.toLowerCase()));

  if (is40ft) {
    return (
      <div className="rack rack-40ft">
        {[0, 1].map((ci) => {
          const absCol = colStart + ci;
          const filled0 = rows[0][absCol];
          const filled1 = rows.length > 1 ? rows[1][absCol] : false;
          const filled = filled0 || filled1;
          let info = getSlotDetails(0, absCol, is40ft, filled, seedBase + absCol);
          if (occupancyLoaded && info.filled === false && filled1) {
            info = getSlotDetails(1, absCol, is40ft, filled, seedBase + absCol);
          }
          const isHL = ((highlighted?.row === 0 || highlighted?.row === 1) && highlighted?.col === absCol)
            || (info.filled && matchesSearch(info.label));
          const isGhost = (ghostPos?.row === 0 || ghostPos?.row === 1) && ghostPos?.col === absCol;
          return (
            <Slot key={ci} info={info} color={color} emptyColor={emptyColor} isHL={isHL} isGhost={isGhost} onClickSlot={onClickSlot} />
          );
        })}
      </div>
    );
  }

  return (
    <div className="rack">
      {rows.map((row, ri) => (
        <div key={ri} className="rack-row">
          {[0, 1].map((ci) => {
            const absCol = colStart + ci;
            const filled = row[absCol];
            const info = getSlotDetails(ri, absCol, is40ft, filled, seedBase + ri * 10 + absCol);
            const isHL = (highlighted?.row === ri && highlighted?.col === absCol)
              || (info.filled && matchesSearch(info.label));
            const isGhost = ghostPos?.row === ri && ghostPos?.col === absCol;
            return (
              <Slot key={ci} info={info} color={color} emptyColor={emptyColor} isHL={isHL} isGhost={isGhost} onClickSlot={onClickSlot} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SlotGrid({ grid, color, emptyColor, highlighted, ghostPos, animDir, onClickSlot, occupancyMap, whType, zoneName, floor, occupancyLoaded, searchTerm }: {
  grid: boolean[][];
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  animDir?: 'left' | 'right' | null;
  onClickSlot?: (info: SlotInfo) => void;
  occupancyMap?: OccupancyMap;
  whType?: string;
  zoneName?: string;
  floor?: number;
  occupancyLoaded?: boolean;
  searchTerm?: string;
}) {
  const rows = grid.length || 4;
  const cols = grid[0]?.length ?? 8;
  const midCol = Math.floor(cols / 2);
  const numGroups = Math.floor(rows / 2);
  const rowGroups = Array.from({ length: numGroups }, (_, gi) => grid.slice(gi * 2, gi * 2 + 2));
  const leftPairs = Array.from({ length: Math.floor(midCol / 2) }, (_, i) => i * 2);
  const rightPairs = Array.from({ length: Math.floor((cols - midCol) / 2) }, (_, i) => midCol + i * 2);

  const animClass = animDir === 'left' ? 'rack-slide-left' : animDir === 'right' ? 'rack-slide-right' : '';

  return (
    <div className={`rack-area ${animClass}`}>
      <div className="rack-section-header">
        <div className="rack-section-label">Dãy 20ft</div>
        <div className="rack-section-sep" />
        <div className="rack-section-label">Dãy 40ft</div>
      </div>
      {rowGroups.map((rg, gi) => {
        const hlInGroup = highlighted && (gi === 0 ? highlighted.row < 2 : highlighted.row >= 2)
          ? { row: highlighted.row - gi * 2, col: highlighted.col }
          : null;
        const ghostInGroup = ghostPos && (gi === 0 ? ghostPos.row < 2 : ghostPos.row >= 2)
          ? { row: ghostPos.row - gi * 2, col: ghostPos.col }
          : null;
        return (
          <div key={gi} className="rack-row-group">
            <div className="rack-block">
              {leftPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} ghostPos={ghostInGroup} is40ft={false} seedBase={gi * 100 + cs} onClickSlot={onClickSlot} occupancyMap={occupancyMap} whType={whType} zoneName={zoneName} floor={floor} baseRow={gi * 2} occupancyLoaded={occupancyLoaded} searchTerm={searchTerm} />
              ))}
            </div>
            <div className="rack-gap" />
            <div className="rack-block">
              {rightPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} ghostPos={ghostInGroup} is40ft={true} seedBase={gi * 100 + cs + 50} onClickSlot={onClickSlot} occupancyMap={occupancyMap} whType={whType} zoneName={zoneName} floor={floor} baseRow={gi * 2} occupancyLoaded={occupancyLoaded} searchTerm={searchTerm} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function WHIcon({ type, size = 18 }: { type: WHType; size?: number }) {
  if (type === 'cold') return <Snowflake size={size} />;
  if (type === 'dry') return <Package size={size} />;
  if (type === 'fragile') return <AlertTriangle size={size} />;
  return <Layers size={size} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
// Phase 2: stat is now passed from parent (from useDashboardStats) instead of
// reading WH_STATS directly.
function StatCard({ wh, stat }: { wh: WHConfig; stat?: WHStat }) {
  return (
    <div className="stat-card">
      <div className="stat-left">
        <p className="stat-name">{wh.name}</p>
        <p className="stat-pct" style={{ color: wh.color }}>{stat?.pct ?? '—'}</p>
        <p className="stat-sub">{stat?.empty ?? 0} vị trí trống</p>
      </div>
      <div className="stat-icon-wrap" style={{ backgroundColor: wh.bgColor }}>
        <span style={{ color: wh.color }}><WHIcon type={wh.id} size={22} /></span>
      </div>
    </div>
  );
}

// ─── Container detail modal ──────────────────────────────────────────────────
function ContainerModal({ info, onClose }: { info: SlotInfo; onClose: () => void }) {
  return (
    <div className="slot-modal-overlay" onClick={onClose}>
      <div className="slot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="slot-modal-header">
          <h3>Container {info.label}</h3>
          <button className="slot-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="slot-modal-body">
          <div className="slot-modal-row">
            <span className="slot-modal-label">Loại</span>
            <span className="slot-modal-value">{info.originalType || info.type}</span>
          </div>
          <div className="slot-modal-row">
            <span className="slot-modal-label">Trạng thái</span>
            <span className={`slot-modal-badge ${info.filled ? 'badge-active' : 'badge-inactive'}`}>
              {info.filled ? 'Hoạt động' : 'Trống'}
            </span>
          </div>
          {info.filled && (
            <>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Hàng hóa</span>
                <span className="slot-modal-value">{info.cargo}</span>
              </div>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Trọng lượng</span>
                <span className="slot-modal-value">{info.weight}</span>
              </div>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Nhiệt độ</span>
                <span className="slot-modal-value">{info.temp}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Warehouse card ───────────────────────────────────────────────────────────
function WarehouseCard({ wh, highlight, ghostPos, ghostZone, ghostFloor, onSlotClick, searchTerm }: {
  wh: WHConfig;
  highlight?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  ghostZone?: string;
  ghostFloor?: number;
  onSlotClick?: (info: SlotInfo, zone: string) => void;
  searchTerm?: string;
}) {
  const [zoneIdx, setZoneIdx] = useState(0);
  const [floor, setFloor] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Phase 3+4: dynamic zone list and grid from yardStore / occupancyStore
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const occupancyLoaded = isOccupancyFetched();
  const zones = getZoneNames(allYards, wh.id);
  const safeIdx = Math.min(zoneIdx, zones.length - 1);
  const currentZone = zones[safeIdx] ?? '';

  // Phase 4: use real occupancy grid per floor when loaded; fall back to mock seeded grid
  const existenceGrid = getZoneGrid(allYards, wh.id, currentZone);
  const grid = occupancyLoaded
    ? getOccupancyBoolGrid(occupancyMap, wh.id, currentZone, floor, existenceGrid)
    : getZoneGridForFloor(allYards, wh.id, currentZone, floor); // Phase 3: mock seeded grid

  // Only show ghost on matching zone and floor
  const showGhost = ghostPos && ghostZone === currentZone && ghostFloor === floor;

  const navigateZone = useCallback((dir: 'left' | 'right') => {
    setAnimDir(dir);
    setZoneIdx((i) => {
      const len = zones.length || 1;
      return dir === 'left' ? (i - 1 + len) % len : (i + 1) % len;
    });
    setTimeout(() => setAnimDir(null), 300);
  }, [zones.length]);

  const selectZone = useCallback((idx: number) => {
    setAnimDir('right');
    setZoneIdx(idx);
    setDropdownOpen(false);
    setTimeout(() => setAnimDir(null), 300);
  }, []);

  const floors = Array.from({ length: wh.totalFloors }, (_, i) => i + 1);

  return (
    <div className="wh-card">
      <div className="wh-card-header">
        <div className="wh-card-title">
          <span style={{ color: wh.color }}><WHIcon type={wh.id} /></span>
          <span className="wh-name">{wh.name}</span>
        </div>
        <span className="wh-active" style={{ color: wh.color }}>Active</span>
      </div>

      <div className="wh-divider" />

      <div className="wh-zone-wrap">
        <button className="wh-zone-selector" style={{ color: wh.color }} onClick={() => setDropdownOpen(!dropdownOpen)}>
          {currentZone} <ChevronDown size={13} className={`wh-zone-chevron ${dropdownOpen ? 'wh-zone-chevron-open' : ''}`} />
        </button>
        {dropdownOpen && (
          <div className="wh-zone-dropdown">
            {zones.map((z, i) => (
              <button
                key={z}
                className={`wh-zone-option ${i === safeIdx ? 'wh-zone-option-active' : ''}`}
                style={{ '--wh-color': wh.color } as React.CSSProperties}
                onClick={() => selectZone(i)}
              >
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="wh-grid-area">
        <button className="wh-nav-btn" onClick={() => navigateZone('left')}>
          <ChevronLeft size={15} />
        </button>
        <SlotGrid grid={grid} color={wh.color} emptyColor={wh.emptyColor} highlighted={highlight}
          ghostPos={showGhost ? ghostPos : null} animDir={animDir} onClickSlot={(info) => onSlotClick ? onSlotClick(info, currentZone) : setSelectedSlot(info)} occupancyMap={occupancyMap} whType={wh.id} zoneName={currentZone} floor={floor} occupancyLoaded={occupancyLoaded} searchTerm={searchTerm} />
        <button className="wh-nav-btn" onClick={() => navigateZone('right')}>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="wh-card-footer">
        <div className="wh-floor-selector">
          <Layers size={13} className="wh-floor-icon" />
          {floors.map((f) => (
            <button
              key={f}
              className={`wh-floor-btn ${f === floor ? 'wh-floor-btn-active' : ''} ${ghostFloor === f && ghostZone === currentZone ? 'wh-floor-btn-ghost' : ''}`}
              style={{ '--wh-color': wh.color } as React.CSSProperties}
              onClick={() => setFloor(f)}
            >
              T{f}
            </button>
          ))}
        </div>
        {wh.hasTemp && <div className="wh-footer-item"><Thermometer size={13} /><span>{wh.temp}</span></div>}
      </div>

      {selectedSlot && <ContainerModal info={selectedSlot} onClose={() => setSelectedSlot(null)} />}
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
function WaitingListPanel({ onClose, onSelect, refreshKey }: {
  onClose: () => void;
  onSelect: (code: string) => void;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchWaitingContainers()
      .then((data) => setItems(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="w2d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Container chờ nhập</h2>
      </div>
      <div className="rp-import-body">
        {loading && <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Đang tải...</p>}
        {error && <p style={{ fontSize: '0.8rem', color: '#f87171', textAlign: 'center', padding: '1rem 0' }}>{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Không có container đang chờ.</p>
        )}
        {items.map((ctn) => (
          <button key={ctn.orderId} className="waiting-item" onClick={() => onSelect(ctn.containerCode)}>
            <div className="waiting-icon"><Truck size={18} /></div>
            <span className="waiting-code">{ctn.containerCode || `Order #${ctn.orderId}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function AlertModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="slot-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="slot-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
        <div className="slot-modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0 }}>
          <h3 style={{ color: '#E11D48', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <AlertTriangle size={24} /> Lỗi Thao Tác
          </h3>
        </div>
        <div className="slot-modal-body" style={{ padding: '16px 24px 24px', fontSize: 14.5, color: '#475569', lineHeight: 1.5 }}>
          {message.split('\n').map((line, i) => (
            <p key={i} style={{ margin: '0 0 8px 0' }}>{line}</p>
          ))}
          <button
            onClick={onClose}
            style={{
              marginTop: 18,
              background: '#E11D48',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              fontSize: 14
            }}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ onClose, initialCode, onPreviewChange, manualClickInfo, onClearManualClick }: {
  onClose: () => void;
  initialCode?: string;
  onPreviewChange: (pos: PreviewPosition | null) => void;
  manualClickInfo?: (SlotInfo & { whType: WHType; zoneName: string }) | null;
  onClearManualClick?: () => void;
}) {
  const [step, setStep] = useState<'form' | 'suggestion' | 'manual'>('form');
  const [form, setForm] = useState({
    containerCode: initialCode ?? '',
    cargoType: 'Hàng Khô',
    sizeType: '20ft' as '20ft' | '40ft',
    weight: '',
    exportDate: '',
    priority: 'Cao',
  });
  const [suggestion, setSuggestion] = useState<SuggestedPosition | null>(null);
  const [manualZone, setManualZone] = useState('Zone A');
  const [manualWarehouse, setManualWH] = useState('Kho Khô');
  const [manualFloor, setManualFloor] = useState('1');
  const [manualPos, setManualPos] = useState('CT01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Clear preview on unmount
  useEffect(() => {
    return () => onPreviewChange(null);
  }, [onPreviewChange]);

  // Handle direct click-to-place from 2D grid
  useEffect(() => {
    if (manualClickInfo) {
      // Prevent floating container placements
      if (manualClickInfo.floor! > 1) {
        const occMap = getOccupancyData();
        const bottomKey = makeSlotKey(manualClickInfo.whType, manualClickInfo.zoneName, manualClickInfo.row!, manualClickInfo.col!, manualClickInfo.floor! - 1);
        if (!occMap.has(bottomKey)) {
          const msg = `Không thể đặt container lơ lửng!\n\nVị trí tầng ${manualClickInfo.floor! - 1} bên dưới ô ${manualClickInfo.label} hiện đang trống.`;
          setAlertMsg(msg);
          setError(msg);
          onClearManualClick?.();
          return;
        }
      }

      const slotId = getSlotIdByCoords(
        getCachedYards(),
        manualClickInfo.whType,
        manualClickInfo.zoneName,
        manualClickInfo.floor!,
        manualClickInfo.row!,
        manualClickInfo.col!
      );

      if (!slotId) {
        setError(`Ô ${manualClickInfo.label} chưa được thiết lập (phân mảnh DB). Vui lòng chọn ô khác có slotId hợp lệ.`);
        onClearManualClick?.();
        return;
      }

      setError(null);
      setStep('manual');
      setManualZone(manualClickInfo.zoneName);
      // Reverse whName from WH_MAP or type
      const whNameMap: Record<string, string> = { 'cold': 'Kho hàng lạnh', 'dry': 'Kho hàng khô', 'fragile': 'Kho hàng dễ vỡ', 'damaged': 'Kho hỏng', 'other': 'Kho khác' };
      const reverseName = whNameMap[manualClickInfo.whType] || 'Kho hàng khô';
      setManualWH(reverseName);
      setManualFloor(String(manualClickInfo.floor!));
      setManualPos(manualClickInfo.label);

      setSuggestion({
        whType: manualClickInfo.whType as any,
        whName: reverseName,
        zone: manualClickInfo.zoneName,
        floor: manualClickInfo.floor!,
        row: manualClickInfo.row!,
        col: manualClickInfo.col!,
        slot: manualClickInfo.label,
        sizeType: manualClickInfo.type,
        efficiency: 100, // manual is 100% intentional
        moves: 0,
        slotId
      });
      onClearManualClick?.();
    }
  }, [manualClickInfo, onClearManualClick]);

  // Phase 5: fetch recommendation from POST /admin/optimization/recommend
  async function handleGetSuggestion() {
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
        setManualPos(sug.slot);
        onPreviewChange({
          whType: sug.whType,
          zone: sug.zone,
          floor: sug.floor,
          row: sug.row,
          col: sug.col,
          sizeType: sug.sizeType,
          containerCode: form.containerCode || 'Container mới',
        });
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

  function handleManualPositionChange(newZone: string, newFloor: string, newWH: string) {
    const whType = cargoTypeToWHType(newWH === 'Kho hàng lạnh' ? 'Hàng Lạnh'
      : newWH === 'Kho hàng dễ vỡ' ? 'Hàng dễ vỡ'
        : newWH === 'Kho hỏng' ? 'Hàng hỏng'
          : newWH === 'Kho khác' ? 'Khác' : 'Hàng Khô');

    onPreviewChange({
      whType,
      zone: newZone,
      floor: parseInt(newFloor),
      row: suggestion?.row ?? 0,
      col: suggestion?.col ?? 0,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      containerCode: form.containerCode || 'Container mới',
    });
  }

  // Pre-fill sizeType based on click
  useEffect(() => {
    if (step === 'manual' && suggestion?.sizeType) {
      setForm(f => ({ ...f, sizeType: suggestion.sizeType }));
    }
  }, [step, suggestion]);

  return (
    <div className="w2d-right-panel">
      {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}
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
            <div className="rp-field"><label>Mã số container</label>
              <input type="text" value={form.containerCode} placeholder="VD: CTN-2026-1234"
                onChange={(e) => setForm({ ...form, containerCode: e.target.value })} /></div>
            <div className="rp-field"><label>Loại hàng</label>
              <div className="rp-select-wrap">
                <select value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="rp-field"><label>Loại container</label>
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
            <div className="rp-field"><label>Trọng lượng</label>
              <input type="text" value={form.weight} placeholder="VD: 25000 kg"
                onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div className="rp-field"><label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="rp-field"><label>Mức độ ưu tiên</label>
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
                  { label: 'Khu nhập', value: manualZone, setter: (v: string) => { setManualZone(v); handleManualPositionChange(v, manualFloor, manualWarehouse); }, options: manualWarehouse === 'Kho hỏng' ? ['Zone A', 'Zone B'] : ['Zone A', 'Zone B', 'Zone C'] },
                  { label: 'Kho nhập', value: manualWarehouse, setter: (v: string) => { setManualWH(v); handleManualPositionChange(manualZone, manualFloor, v); }, options: ['Kho hàng khô', 'Kho hàng lạnh', 'Kho hàng dễ vỡ', 'Kho hỏng', 'Kho khác'] },
                  { label: 'Tầng', value: manualFloor, setter: (v: string) => { setManualFloor(v); handleManualPositionChange(manualZone, v, manualWarehouse); }, options: ['1', '2', '3'] },
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
                <div className="rp-field">
                  <label>Vị trí</label>
                  <input type="text" value={manualPos}
                    onChange={(e) => setManualPos(e.target.value)} />
                </div>
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

// ─── Export panel ────────────────────────────────────────────────────────────
function ExportPanel2D({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [containers, setContainers] = useState<InYardContainer[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<InYardContainer | null>(null);
  const [gateOutLoading, setGateOutLoading] = useState(false);
  const [gateOutError, setGateOutError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<GateOutInvoice | null>(null);

  const load = useCallback((kw: string) => {
    setFetchLoading(true); setFetchError(null);
    searchInYardContainers(kw)
      .then(setContainers)
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setFetchLoading(false));
  }, []);

  useEffect(() => { load(''); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(keyword), 300); return () => clearTimeout(t); }, [keyword, load]);

  async function handleGateOut() {
    if (!confirmTarget) return;
    setGateOutLoading(true); setGateOutError(null);
    try {
      const gateOutId = await performGateOutForManagement(confirmTarget.containerId);
      setContainers((prev) => prev.filter((c) => c.containerId !== confirmTarget.containerId));
      setConfirmTarget(null);
      try { setInvoice(await fetchGateOutInvoice(gateOutId)); } catch { /* non-critical */ }
      onDone();
    } catch (e) {
      setGateOutError(e instanceof Error ? e.message : 'Xuất kho thất bại');
    } finally { setGateOutLoading(false); }
  }

  if (invoice) {
    return (
      <div className="w2d-right-panel">
        <div className="rp-import-header">
          <button className="rp-back-btn" onClick={() => setInvoice(null)}><ChevronLeft size={18} /></button>
          <h2 className="rp-import-title">Hóa đơn xuất kho</h2>
        </div>
        <div className="rp-import-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#16a34a', fontWeight: 600 }}>
            <FileText size={18} /> Xuất kho thành công!
          </div>
          {[
            ['Hóa đơn #', String(invoice.invoiceId)],
            ['Mã container', invoice.containerCode],
            ['Loại hàng', invoice.cargoType],
            ['Thời gian nhập', invoice.gateInTime || '—'],
            ['Thời gian xuất', invoice.gateOutTime || '—'],
            ['Số ngày lưu', `${invoice.storageDays} ngày`],
            ['Phí / ngày', invoice.feePerDay],
            ['Tổng cộng', invoice.totalAmount],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <button className="btn-primary rp-submit-btn" style={{ marginTop: 16 }} onClick={() => { setInvoice(null); onClose(); }}>Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w2d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Xuất kho</h2>
      </div>
      <div className="rp-import-body">
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Tìm mã container..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
        </div>
        {fetchLoading && <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Đang tải...</p>}
        {fetchError && <p style={{ fontSize: '0.8rem', color: '#f87171', textAlign: 'center', padding: '1rem 0' }}>{fetchError}</p>}
        {!fetchLoading && !fetchError && containers.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0' }}>Không có container trong bãi.</p>
        )}
        {containers.map((c) => (
          <button key={c.containerId} className="waiting-item" onClick={() => { setConfirmTarget(c); setGateOutError(null); }}>
            <div className="waiting-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><LogOut size={16} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <span className="waiting-code">{c.containerCode}</span>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
                {[c.cargoType, c.containerType, c.whName, c.zone].filter(Boolean).join(' · ')}
              </div>
            </div>
          </button>
        ))}
      </div>

      {confirmTarget && (
        <div onClick={gateOutLoading ? undefined : () => setConfirmTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 300, maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Xác nhận xuất kho</h3>
              <button onClick={() => setConfirmTarget(null)} disabled={gateOutLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            {gateOutError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12 }}>{gateOutError}</p>}
            {[
              ['Mã container', confirmTarget.containerCode],
              ['Loại hàng', confirmTarget.cargoType],
              ['Kho', confirmTarget.whName],
              ['Zone', confirmTarget.zone],
              ['Vị trí', confirmTarget.slot],
            ].map(([label, value]) => (
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
type PanelMode = null | 'waiting-list' | 'import' | 'export';

export function Warehouse2D() {
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedCode, setCode] = useState<string | undefined>(undefined);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const [manualClickInfo, setManualClickInfo] = useState<(SlotInfo & { whType: WHType; zoneName: string }) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waitingRefreshKey, setWaitingRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  function selectContainer(code: string) { setCode(code); setPanelMode('import'); }
  function closePanel() { setPanelMode(null); setCode(undefined); setPreviewPosition(null); setManualClickInfo(null); }

  function handleSlotClick(info: SlotInfo, wh: WHConfig, currentZone: string) {
    if (panelMode === 'import' && !info.filled) {
      setManualClickInfo({ ...info, whType: wh.id, zoneName: currentZone });
    }
  }

  // Phase 2: real occupancy stats from backend
  const { stats: whStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const yards = await fetchAllYards();
      setYardData(processApiYards(yards));
      await fetchAndSetOccupancy(yards);
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
      <div className="w2d-page">

        <div className="w2d-header">
          <h1 className="w2d-title">Sơ đồ 2D mặt phẳng kho bãi</h1>
          <p className="w2d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
        </div>

        {/* Phase 2: real data from /admin/dashboard */}
        <div className="w2d-stat-row" style={statsLoading ? { opacity: 0.6 } : undefined}>
          {statsError && (
            <p style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.25rem', width: '100%' }}>
              Không thể tải dữ liệu ({statsError})
            </p>
          )}
          {WAREHOUSES.map((wh) => (
            <StatCard key={wh.id} wh={wh} stat={whStats.find(s => s.id === wh.id)} />
          ))}
        </div>

        <div className="w2d-action-bar">
          {panelMode === null && (
            <button className="ctn-card" onClick={() => setPanelMode('waiting-list')}>
              <div className="ctn-card-icon"><Truck size={20} /></div>
              <div className="ctn-card-text">
                <span className="ctn-card-label">Container chờ nhập kho</span>
                <span className="ctn-card-sub">Xem danh sách chờ</span>
              </div>
              <ChevronRight size={17} className="ctn-card-chevron" />
            </button>
          )}
          <div className="w2d-spacer" />
          <div className="w2d-search">
            <Search size={15} className="w2d-search-icon" />
            <input
              type="text"
              placeholder="Nhập mã số Container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary w2d-import-btn" onClick={() => setPanelMode('import')}>
            <Plus size={17} /><span>Nhập kho</span>
          </button>
          <button
            className="w2d-import-btn"
            style={panelMode === 'export' ? { background: '#dc2626', color: '#fff', border: '1px solid #dc2626' } : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            onClick={() => setPanelMode(panelMode === 'export' ? null : 'export')}
            title="Xuất kho container"
          >
            <LogOut size={17} /><span>Xuất kho</span>
          </button>
          <button
            className="w2d-import-btn"
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isRefreshing ? 'refresh-spinning' : ''} /><span>Làm mới</span>
          </button>
        </div>

        <div className="w2d-content-row">
          <div className="w2d-wh-grid">
            {WAREHOUSES.map((wh) => (
              <WarehouseCard
                key={wh.id}
                wh={wh}
                ghostPos={previewPosition && previewPosition.whType === wh.id ? { row: previewPosition.row, col: previewPosition.col } : null}
                ghostZone={previewPosition && previewPosition.whType === wh.id ? previewPosition.zone : undefined}
                ghostFloor={previewPosition && previewPosition.whType === wh.id ? previewPosition.floor : undefined}
                onSlotClick={(info, zone) => handleSlotClick(info, wh, zone)}
                searchTerm={searchTerm.trim() || undefined}
              />
            ))}
          </div>

          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} refreshKey={waitingRefreshKey} />
          )}
          {panelMode === 'import' && (
            <ImportPanel onClose={closePanel} initialCode={selectedCode} onPreviewChange={setPreviewPosition} manualClickInfo={manualClickInfo} onClearManualClick={() => setManualClickInfo(null)} />
          )}
          {panelMode === 'export' && (
            <ExportPanel2D onClose={closePanel} onDone={handleRefresh} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
