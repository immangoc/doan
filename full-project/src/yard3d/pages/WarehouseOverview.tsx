import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Compass,
  Package, Calendar, Truck, Snowflake, AlertTriangle, Layers, Info,
  LogOut, RefreshCw, TrendingUp, TrendingDown, Archive, Bell,
  Clock, CheckCircle, BarChart3, Activity, Box, LayoutDashboard,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { OverviewScene } from '../components/3d/OverviewScene';
import type { OverviewSceneHandle } from '../components/3d/OverviewScene';
import { Legend } from '../components/ui/Legend';
import type { WHType, ZoneInfo, WHStat, PreviewPosition } from '../data/warehouse';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import type { ZoneOccupancy } from '../hooks/useAdminDashboard';
import {
  subscribe, getImportedContainers, cargoTypeToWHType, cargoTypeToWHName,
} from '../data/containerStore';
import type { SuggestedPosition } from '../data/containerStore';
import { fetchRecommendation, confirmGateIn, resolveYardId } from '../services/gateInService';
import type { GateInParams } from '../services/gateInService';
import { fetchAndSetOccupancy } from '../services/containerPositionService';
import { fetchAllYards, getCachedYards } from '../services/yardService';
import { processApiYards, setYardData, getSlotIdByCoords } from '../store/yardStore';
import {
  searchInYardContainers, performGateOut, fetchWaitingContainers, fetchStorageBill,
} from '../services/gateOutService';
import type { InYardContainer, WaitingItem, StorageBill } from '../services/gateOutService';
import './WarehouseOverview.css';

// ─── Icons ────────────────────────────────────────────────────────────────────
function WHIcon({ type, size = 18 }: { type: WHType; size?: number }) {
  if (type === 'cold') return <Snowflake size={size} />;
  if (type === 'dry') return <Package size={size} />;
  if (type === 'fragile') return <AlertTriangle size={size} />;
  if (type === 'damaged') return <span style={{ fontWeight: 'bold', fontSize: size }}>!</span>;
  return <Layers size={size} />;
}

// ─── KPI Big Card ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color, bg, trend,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string; bg: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="ov-kpi-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="ov-kpi-top">
        <div className="ov-kpi-icon-wrap" style={{ background: bg }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend === 'up' && <TrendingUp size={14} style={{ color: '#10b981' }} />}
        {trend === 'down' && <TrendingDown size={14} style={{ color: '#f87171' }} />}
      </div>
      <div className="ov-kpi-value">{value}</div>
      <div className="ov-kpi-label">{label}</div>
      {sub && <div className="ov-kpi-sub">{sub}</div>}
    </div>
  );
}

// ─── Zone occupancy bar ───────────────────────────────────────────────────────
function ZoneBar({ zone }: { zone: ZoneOccupancy }) {
  const pct = Math.round(zone.occupancyRate * 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="ov-zone-bar-row">
      <div className="ov-zone-bar-label">
        <span className="ov-zone-name">{zone.yardName} - {zone.zoneName.replace('Zone ', '')}</span>
        <span className="ov-zone-pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="ov-zone-bar-track">
        <div className="ov-zone-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="ov-zone-bar-counts">
        {zone.occupiedSlots}/{zone.capacitySlots} vị trí
      </div>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  IN_YARD: { bg: '#d1fae5', color: '#065f46' },
  GATE_OUT: { bg: '#dbeafe', color: '#1e40af' },
  EXPORTED: { bg: '#e0e7ff', color: '#3730a3' },
  PENDING: { bg: '#fef3c7', color: '#92400e' },
  default: { bg: '#f3f4f6', color: '#374151' },
};

function StatusBadge({ name, count }: { name: string; count: number }) {
  const { bg, color } = STATUS_COLORS[name] ?? STATUS_COLORS.default;
  return (
    <div className="ov-status-badge" style={{ background: bg }}>
      <span className="ov-status-count" style={{ color }}>{count}</span>
      <span className="ov-status-name" style={{ color }}>{name}</span>
    </div>
  );
}

// ─── Stat card (WH type) ──────────────────────────────────────────────────────
function StatCard({ wh, onClick }: { wh: WHStat; onClick: () => void }) {
  return (
    <button className="ov-stat-card" onClick={onClick}>
      <div className="ov-stat-left">
        <p className="ov-stat-name">{wh.name}</p>
        <p className="ov-stat-pct" style={{ color: wh.color }}>{wh.pct}</p>
        <p className="ov-stat-sub">{wh.empty} vị trí trống</p>
      </div>
      <div className="ov-stat-icon-wrap" style={{ backgroundColor: wh.bgColor }}>
        <span style={{ color: wh.color }}><WHIcon type={wh.id} size={22} /></span>
      </div>
    </button>
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
  const imported = useSyncExternalStore(subscribe, getImportedContainers);
  const whTypeMap: Record<string, WHType> = {
    'Kho hàng lạnh': 'cold', 'Kho hàng khô': 'dry', 'Kho hàng dễ vỡ': 'fragile', 'Kho hỏng': 'damaged', 'Kho khác': 'other',
  };
  const whType = whTypeMap[zone.type];
  const recentFromStore = whType
    ? imported.filter((c) => c.whType === whType && c.zone === zone.name).slice(0, 5)
    : [];
  const recentCodes = recentFromStore.length > 0
    ? recentFromStore.map((c) => `${c.code} (${c.zone} T${c.floor})`)
    : zone.recentContainers;

  return (
    <div className="ov-right-panel">
      <div className="ov-rp-zone-header">
        <h2 className="ov-rp-zone-name">{zone.name}</h2>
        <p className="ov-rp-zone-type">{zone.type}</p>
      </div>
      {isWarning && (
        <div className="ov-rp-warning-banner">
          <AlertTriangle size={16} />
          <span>Cảnh báo: Khu vực gần đầy ({zone.fillRate}%)</span>
        </div>
      )}
      <div className="ov-rp-section-label">Tỷ lệ lấp đầy</div>
      <div className="ov-rp-donut-wrap"><DonutChart pct={zone.fillRate} /></div>
      <p className="ov-rp-stat">Số vị trí trống: <strong>{zone.emptySlots}/{zone.totalSlots}</strong></p>
      <div className="ov-rp-section-label ov-rp-mt">Danh sách Container nhập gần đây:</div>
      <ul className="ov-rp-container-list">
        {recentCodes.length > 0
          ? recentCodes.map((c) => <li key={c}>{c}</li>)
          : <li className="ov-rp-empty-hint">Chưa có container nhập gần đây</li>
        }
      </ul>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeCargoType(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('lạnh')) return 'Hàng Lạnh';
  if (s.includes('vỡ') || s.includes('dễ')) return 'Hàng dễ vỡ';
  if (s.includes('hỏng')) return 'Hàng hỏng';
  return 'Hàng Khô';
}

// ─── Waiting list panel ──────────────────────────────────────────────────────
function WaitingListPanel({ onClose, onSelect, refreshKey }: {
  onClose: () => void;
  onSelect: (item: WaitingItem) => void;
  refreshKey?: number;
}) {
  const [containers, setContainers] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWaitingContainers()
      .then((list) => { if (!cancelled) setContainers(list); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="ov-rp-panel-title">Container chờ nhập</h2>
        {!loading && !error && <span className="ov-rp-badge">{containers.length}</span>}
      </div>
      <div className="ov-rp-panel-body">
        {loading && <p className="ov-rp-empty">Đang tải...</p>}
        {error && <p className="ov-rp-empty" style={{ color: '#f87171' }}>{error}</p>}
        {!loading && !error && containers.length === 0 && (
          <p className="ov-rp-empty">Không có container đang chờ nhập</p>
        )}
        {!loading && !error && containers.map((ctn) => (
          <button key={ctn.orderId} className="ov-waiting-item" onClick={() => onSelect(ctn)}>
            <div className="ov-waiting-icon"><Truck size={18} /></div>
            <div className="ov-waiting-info">
              <span className="ov-waiting-code">{ctn.containerCode}</span>
              <span className="ov-waiting-meta">{ctn.cargoType} &middot; {ctn.orderDate}</span>
            </div>
            <ChevronRight size={16} className="ov-waiting-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Export panel ────────────────────────────────────────────────────────────
type ExportStep = 'search' | 'confirm';

function ExportPanel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ExportStep>('search');
  const [searchCode, setSearchCode] = useState('');
  const [containers, setContainers] = useState<InYardContainer[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedExport, setSelectedExport] = useState<InYardContainer | null>(null);
  const [gateOutLoading, setGateOutLoading] = useState(false);
  const [gateOutError, setGateOutError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [bill, setBill] = useState<StorageBill | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const doSearch = useCallback((keyword: string) => {
    setFetchLoading(true);
    setFetchError(null);
    searchInYardContainers(keyword)
      .then(setContainers)
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setFetchLoading(false));
  }, []);

  useEffect(() => { doSearch(''); }, [doSearch]);
  useEffect(() => {
    const t = setTimeout(() => doSearch(searchCode), 300);
    return () => clearTimeout(t);
  }, [searchCode, doSearch]);

  function selectForExport(ctn: InYardContainer) {
    setSelectedExport(ctn);
    setGateOutError(null);
    setNote('');
    setBill(null);
    setStep('confirm');
    setBillLoading(true);
    fetchStorageBill(ctn.containerId)
      .then(setBill)
      .catch(() => setBill(null))
      .finally(() => setBillLoading(false));
  }

  async function handleConfirmGateOut() {
    if (!selectedExport) return;
    setGateOutLoading(true);
    setGateOutError(null);
    try {
      await performGateOut(selectedExport.containerId, note);
      setContainers((prev) => prev.filter((c) => c.containerId !== selectedExport.containerId));
      onClose();
    } catch (e) {
      setGateOutError(e instanceof Error ? e.message : 'Xuất kho thất bại');
      setGateOutLoading(false);
    }
  }

  const fmtNum = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return new Intl.NumberFormat('vi-VN').format(n);
  };

  const fmtVND = (v: number): string =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const infoRows: Array<[string, string]> = selectedExport
    ? [
        ['Mã container',   selectedExport.containerCode],
        ['Trạng thái',     selectedExport.statusName],
        ['Loại hàng',      selectedExport.cargoType],
        ['Loại cont.',     selectedExport.containerType],
        ['Trọng lượng',    selectedExport.grossWeight ? `${fmtNum(selectedExport.grossWeight)} kg` : ''],
        ['Giá trị khai báo', selectedExport.declaredValue ? fmtVND(Number(selectedExport.declaredValue)) : ''],
        ['Số seal',        selectedExport.sealNumber],
        ['Kho',            selectedExport.whName],
        ['Loại kho',       selectedExport.yardType],
        ['Zone',           selectedExport.zone],
        ['Block',          selectedExport.blockName],
        ['Vị trí',         selectedExport.slot],
        ['Ghi chú',        selectedExport.note],
      ]
    : [];

  return (
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={step === 'confirm' ? () => { setStep('search'); setGateOutError(null); } : onClose}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="ov-rp-panel-title">Xuất Container</h2>
      </div>
      <div className="ov-rp-panel-body">
        {step === 'search' && (
          <>
            <div className="ov-rp-field">
              <label>Tìm container xuất kho</label>
              <div className="ov-rp-search-input">
                <Search size={14} className="ov-rp-search-ico" />
                <input
                  type="text"
                  placeholder="Nhập mã container..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
              </div>
            </div>
            {fetchError && <p className="ov-rp-empty" style={{ color: '#f87171' }}>{fetchError}</p>}
            <div className="ov-rp-list-label">
              Container trong kho {fetchLoading ? '(đang tải...)' : `(${containers.length})`}
            </div>
            {!fetchLoading && containers.map((ctn) => (
              <button key={ctn.containerId} className="ov-waiting-item" onClick={() => selectForExport(ctn)}>
                <div className="ov-waiting-icon ov-export-icon"><LogOut size={18} /></div>
                <div className="ov-waiting-info">
                  <span className="ov-waiting-code">{ctn.containerCode}</span>
                  <span className="ov-waiting-meta">
                    {ctn.cargoType || '—'} &middot; {ctn.whName}
                    {ctn.zone && ctn.zone !== '—' ? ` · ${ctn.zone}` : ''}
                  </span>
                </div>
                <ChevronRight size={16} className="ov-waiting-chevron" />
              </button>
            ))}
            {!fetchLoading && !fetchError && containers.length === 0 && (
              <p className="ov-rp-empty">Không tìm thấy container</p>
            )}
          </>
        )}

        {step === 'confirm' && selectedExport && (
          <>
            {gateOutError && (
              <div className="ov-rp-error-banner" style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {gateOutError}
              </div>
            )}

            {selectedExport.inActiveOrder && (
              <div style={{
                fontSize: '0.75rem', background: '#fef3c7', color: '#92400e',
                borderRadius: 6, padding: '0.5rem 0.75rem',
              }}>
                ⚠ Container đang thuộc đơn hàng chưa kết thúc. Xuất kho sẽ đánh dấu đơn đã xuất.
              </div>
            )}

            <div className="ov-rp-suggestion-card">
              <div className="ov-rp-sug-header">
                <div className="ov-rp-sug-icon"><LogOut size={16} /></div>
                <span className="ov-rp-sug-title">Thông tin container</span>
              </div>
              {infoRows
                .filter(([, v]) => v && v !== '—')
                .map(([label, value]) => (
                  <div key={label} className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">{label}</span>
                    <span className="ov-rp-sug-value ov-rp-blue">{value}</span>
                  </div>
                ))}
            </div>

            {/* Storage bill preview */}
            <div className="ov-rp-suggestion-card" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
              <div className="ov-rp-sug-header">
                <div className="ov-rp-sug-icon" style={{ background: '#f97316' }}><Info size={16} /></div>
                <span className="ov-rp-sug-title">Phí lưu kho</span>
              </div>
              {billLoading ? (
                <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Đang tính phí…</span></div>
              ) : bill ? (
                <>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Số ngày lưu</span>
                    <span className="ov-rp-sug-value">{bill.days} ngày</span>
                  </div>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Số ngày tính phí</span>
                    <span className="ov-rp-sug-value">{bill.billableDays} ngày</span>
                  </div>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Giá/ngày</span>
                    <span className="ov-rp-sug-value">{fmtVND(bill.ratePerDay)}</span>
                  </div>
                  <div className="ov-rp-sug-row" style={{ borderTop: '1px solid #fed7aa', paddingTop: 6, marginTop: 4 }}>
                    <span className="ov-rp-sug-label" style={{ fontWeight: 600, color: '#9a3412' }}>Tổng phí</span>
                    <span className="ov-rp-sug-value" style={{ color: '#c2410c', fontWeight: 700 }}>
                      {fmtVND(bill.total)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Không có dữ liệu lưu kho để tính phí</span></div>
              )}
            </div>

            {/* Gate-out note input */}
            <div className="ov-rp-field">
              <label>Ghi chú xuất kho (tuỳ chọn)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Giao cho KH, xe BKS 29H-1234…"
                className="ov-rp-input"
                maxLength={255}
              />
            </div>

            <button
              className="btn-primary ov-rp-submit-btn"
              onClick={handleConfirmGateOut}
              disabled={gateOutLoading}
            >
              {gateOutLoading ? 'Đang xử lý...' : 'Xác nhận xuất kho'}
            </button>
            <button className="ov-rp-cancel-link" onClick={() => { setStep('search'); setGateOutError(null); }}>Quay lại</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Import panel ────────────────────────────────────────────────────────────
type ImportStep = 'form' | 'suggestion' | 'manual';

function ImportPanel({ onClose, initialCode, initialItem, onPreviewChange }: {
  onClose: () => void;
  initialCode?: string;
  initialItem?: WaitingItem;
  onPreviewChange: (pos: PreviewPosition | null) => void;
}) {
  const [step, setStep] = useState<ImportStep>('form');
  const [form, setForm] = useState({
    containerCode: initialItem?.containerCode ?? initialCode ?? '',
    cargoType: initialItem ? normalizeCargoType(initialItem.cargoType) : 'Hàng Khô',
    sizeType: ((initialItem?.containerType ?? '').toUpperCase().includes('40') ? '40ft' : '20ft') as '20ft' | '40ft',
    weight: initialItem?.weight ?? '',
    exportDate: '',
    priority: 'Trung bình',
  });
  const [suggestion, setSuggestion] = useState<SuggestedPosition | null>(null);
  const [manualZone, setManualZone] = useState('Zone A');
  const [manualWarehouse, setManualWH] = useState('Kho Khô');
  const [manualFloor, setManualFloor] = useState('1');
  const [manualPos, setManualPos] = useState('CT01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { return () => onPreviewChange(null); }, [onPreviewChange]);

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
          whType: sug.whType, zone: sug.zone, floor: sug.floor,
          row: sug.row, col: sug.col, sizeType: sug.sizeType,
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

  async function handleConfirmImport() {
    const slotId = suggestion?.slotId;
    if (!slotId) { setError('Vui lòng lấy gợi ý vị trí trước khi xác nhận nhập kho'); return; }
    setLoading(true);
    setError(null);
    const floor = step === 'manual' ? parseInt(manualFloor) : (suggestion?.floor ?? 1);
    const yardId = resolveYardId(suggestion?.whName ?? manualWarehouse, suggestion?.whType ?? '');
    const params: GateInParams = {
      containerCode: form.containerCode, cargoType: form.cargoType,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      weight: form.weight, exportDate: form.exportDate, priority: form.priority,
      yardId, slotId, tier: floor, skipContainerCheck: !!initialItem,
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
    const floor = parseInt(newFloor);
    const row = suggestion?.row ?? 0;
    const col = suggestion?.col ?? (form.sizeType === '40ft' ? 4 : 0);
    const newSlotId = getSlotIdByCoords(getCachedYards(), whType, newZone, floor, row, col);
    setSuggestion((prev) => prev ? { ...prev, whType, whName: newWH, zone: newZone, floor, slotId: newSlotId } : null);
    onPreviewChange({ whType, zone: newZone, floor, row, col, sizeType: suggestion?.sizeType ?? form.sizeType, containerCode: form.containerCode || 'Container mới' });
  }

  return (
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={step === 'form' ? () => { onPreviewChange(null); onClose(); } : () => { setStep('form'); onPreviewChange(null); }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="ov-rp-panel-title">Nhập Container</h2>
      </div>
      <div className="ov-rp-panel-body">
        {error && <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}
        {step === 'form' && (
          <>
            {initialItem && (
              <div style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                Container từ danh sách chờ — thông tin đã điền sẵn
              </div>
            )}
            <div className="ov-rp-field">
              <label>Mã số container</label>
              <input type="text" value={form.containerCode} placeholder="VD: CTN-2026-1234"
                readOnly={!!initialItem}
                style={initialItem ? { background: '#f9fafb', color: '#6b7280', cursor: 'default' } : undefined}
                onChange={(e) => { if (!initialItem) setForm({ ...form, containerCode: e.target.value }); }}
                className="ov-rp-input" />
            </div>
            <div className="ov-rp-field">
              <label>Loại hàng</label>
              <div className="ov-rp-select-wrap">
                <select value={form.cargoType} onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Hàng hỏng</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Loại container</label>
              <div className="ov-rp-size-toggle">
                <button type="button" className={`ov-rp-size-btn ${form.sizeType === '20ft' ? 'ov-rp-size-btn-active' : ''}`} onClick={() => setForm({ ...form, sizeType: '20ft' })}>20ft</button>
                <button type="button" className={`ov-rp-size-btn ${form.sizeType === '40ft' ? 'ov-rp-size-btn-active' : ''}`} onClick={() => setForm({ ...form, sizeType: '40ft' })}>40ft</button>
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Trọng lượng</label>
              <input type="text" value={form.weight} placeholder="VD: 25000 kg" onChange={(e) => setForm({ ...form, weight: e.target.value })} className="ov-rp-input" />
            </div>
            <div className="ov-rp-field">
              <label>Ngày xuất (dự kiến)</label>
              <div className="ov-rp-date-wrap">
                <Calendar size={15} className="ov-rp-date-icon" />
                <input type="date" value={form.exportDate} onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Mức độ ưu tiên</label>
              <div className="ov-rp-select-wrap">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Cao</option><option>Trung bình</option><option>Thấp</option>
                </select>
              </div>
            </div>
            <button className="btn-primary ov-rp-submit-btn" onClick={handleGetSuggestion} disabled={loading}>
              {loading ? 'Đang tải...' : 'Nhận gợi ý vị trí'}
            </button>
          </>
        )}

        {(step === 'suggestion' || step === 'manual') && (
          <>
            <div className="ov-rp-suggestion-card">
              <div className="ov-rp-sug-header">
                <div className="ov-rp-sug-icon"><Info size={16} /></div>
                <span className="ov-rp-sug-title">Gợi ý vị trí</span>
              </div>
              {suggestion ? (
                <>
                  <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Kho</span><span className="ov-rp-sug-value ov-rp-blue">{suggestion.whName}</span></div>
                  <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Vị trí</span><span className="ov-rp-sug-value ov-rp-blue">{suggestion.zone} - Tầng {suggestion.floor} - {suggestion.slot}</span></div>
                  <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Hiệu quả tối ưu</span><span className="ov-rp-sug-value ov-rp-blue">{suggestion.efficiency}%</span></div>
                  <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Container đảo chuyển</span><span className="ov-rp-sug-value ov-rp-blue">{suggestion.moves}</span></div>
                </>
              ) : (
                <div className="ov-rp-sug-row"><span className="ov-rp-sug-label">Không tìm thấy vị trí trống phù hợp</span></div>
              )}
            </div>
            {step === 'suggestion' && (
              <>
                <button className="btn-primary ov-rp-submit-btn" onClick={handleConfirmImport} disabled={loading}>{loading ? 'Đang xử lý...' : 'Xác nhận nhập'}</button>
                <button className="ov-rp-cancel-link" onClick={() => setStep('manual')} disabled={loading}>Điều chỉnh thủ công</button>
                <button className="ov-rp-cancel-link" onClick={() => { onPreviewChange(null); onClose(); }} disabled={loading}>Hủy</button>
              </>
            )}
            {step === 'manual' && (
              <>
                <div className="ov-rp-manual-title">Điều chỉnh vị trí thủ công</div>
                {[
                  { label: 'Khu nhập', value: manualZone, setter: (v: string) => { setManualZone(v); handleManualPositionChange(v, manualFloor, manualWarehouse); }, options: manualWarehouse === 'Kho hỏng' ? ['Zone A', 'Zone B'] : ['Zone A', 'Zone B', 'Zone C'] },
                  { label: 'Kho nhập', value: manualWarehouse, setter: (v: string) => { setManualWH(v); handleManualPositionChange(manualZone, manualFloor, v); }, options: ['Kho hàng khô', 'Kho hàng lạnh', 'Kho hàng dễ vỡ', 'Kho hỏng', 'Kho khác'] },
                  { label: 'Tầng', value: manualFloor, setter: (v: string) => { setManualFloor(v); handleManualPositionChange(manualZone, v, manualWarehouse); }, options: ['1', '2', '3'] },
                ].map(({ label, value, setter, options }) => (
                  <div key={label} className="ov-rp-field">
                    <label>{label}</label>
                    <div className="ov-rp-select-wrap">
                      <select value={value} onChange={(e) => setter(e.target.value)}>
                        {options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="ov-rp-field">
                  <label>Vị trí</label>
                  <input type="text" value={manualPos} onChange={(e) => setManualPos(e.target.value)} className="ov-rp-input" />
                </div>
                <button className="btn-primary ov-rp-submit-btn" onClick={handleConfirmImport} disabled={loading}>{loading ? 'Đang xử lý...' : 'Xác nhận nhập'}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type PanelMode = null | 'zone' | 'waiting-list' | 'import' | 'export';

export function WarehouseOverview() {
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<WaitingItem | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waitingRefreshKey, setWaitingRefreshKey] = useState(0);
  const sceneRef = useRef<OverviewSceneHandle>(null);
  const navigate = useNavigate();

  const { stats: whStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: dashData, loading: dashLoading, refetch: refetchDash } = useAdminDashboard();
  const { kpi, zoneOccupancy } = dashData;

  function handleZoneClick(zone: ZoneInfo) { setSelectedZone(zone); setPanelMode('zone'); }
  function closePanel() { setPanelMode(null); setSelectedZone(null); setSelectedCode(undefined); setSelectedItem(undefined); setPreviewPosition(null); }
  function openWaiting() { setPanelMode('waiting-list'); setSelectedZone(null); }
  function selectContainer(item: WaitingItem) { setSelectedCode(item.containerCode); setSelectedItem(item); setPanelMode('import'); }
  function navigateToWarehouse(whId: WHType) { navigate(`/yard/3d?wh=${whId}`); }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const yards = await fetchAllYards();
      setYardData(processApiYards(yards));
      await fetchAndSetOccupancy(yards);
      refetchStats();
      refetchDash();
      if (panelMode === 'waiting-list') setWaitingRefreshKey(k => k + 1);
    } finally {
      setIsRefreshing(false);
    }
  }

  const yardFillRate = kpi.containersInYard > 0 && zoneOccupancy.length > 0
    ? Math.round((kpi.containersInYard / zoneOccupancy.reduce((s, z) => s + z.capacitySlots, 0)) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="ov-page">

        {/* ── Header ── */}
        <div className="ov-header">
          <div>
            <h1 className="ov-title">Tổng quan kho bãi</h1>
            <p className="ov-subtitle">Bảng điều khiển — dữ liệu thực từ hệ thống</p>
          </div>
          <div className="ov-header-actions">
            <button className="ov-btn-nav" onClick={() => navigate('/yard/3d')}>
              <LayoutDashboard size={16} /><span>Sơ đồ 3D</span>
            </button>
            <button
              className="ov-btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} className={isRefreshing ? 'refresh-spinning' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* ── KPI Row 1 ── */}
        <div className="ov-kpi-row">
          <KpiCard label="Container trong kho" value={kpi.containersInYard}
            sub={`Tổng: ${kpi.totalContainers}`}
            icon={<Archive size={20} />} color="#1d4ed8" bg="#dbeafe" />
          <KpiCard label="Nhập hôm nay" value={kpi.gateInToday}
            icon={<TrendingUp size={20} />} color="#059669" bg="#d1fae5" trend="up" />
          <KpiCard label="Xuất hôm nay" value={kpi.gateOutToday}
            icon={<TrendingDown size={20} />} color="#0891b2" bg="#cffafe" trend="down" />
          <KpiCard label="Đơn hàng chờ" value={kpi.pendingOrders}
            sub={`Tổng đơn: ${kpi.totalOrders}`}
            icon={<Clock size={20} />} color="#d97706" bg="#fef3c7" />
          <KpiCard label="Container quá hạn" value={kpi.overdueContainers}
            icon={<AlertTriangle size={20} />} color="#dc2626" bg="#fee2e2"
            trend={kpi.overdueContainers > 0 ? 'down' : 'neutral'} />
          <KpiCard label="Cảnh báo hệ thống" value={kpi.openAlerts}
            sub={`${kpi.criticalAlerts} nghiêm trọng`}
            icon={<Bell size={20} />} color="#7c3aed" bg="#ede9fe"
            trend={kpi.criticalAlerts > 0 ? 'down' : 'neutral'} />
        </div>

        {/* ── Dashboard row: Donut + Status + Warehouse summary ── */}
        <div className="ov-dash-row">
          {/* Donut chart */}
          <div className="ov-dash-card ov-dash-card-donut">
            <div className="ov-dash-card-header">
              <BarChart3 size={18} className="ov-dash-card-icon" />
              <h3>Độ lấp đầy</h3>
            </div>
            <DonutChart pct={yardFillRate} />
            <div className="ov-donut-meta">
              <strong>{kpi.containersInYard}</strong> / {zoneOccupancy.reduce((s, z) => s + z.capacitySlots, 0)} vị trí
            </div>
          </div>

          {/* Container status breakdown */}
          <div className="ov-dash-card">
            <div className="ov-dash-card-header">
              <Activity size={18} className="ov-dash-card-icon" />
              <h3>Trạng thái container</h3>
            </div>
            <div className="ov-status-list">
              {kpi.containersByStatus.map((s) => {
                const total = kpi.totalContainers || 1;
                const pct = Math.round((s.count / total) * 100);
                const barColor =
                  s.name === 'IN_YARD'   ? '#10b981' :
                  s.name === 'GATE_IN'   ? '#3b82f6' :
                  s.name === 'GATE_OUT'  ? '#f59e0b' :
                  s.name === 'AVAILABLE' ? '#8b5cf6' : '#6b7280';
                return (
                  <div key={s.name}>
                    <div className="ov-status-row-label">
                      <span className="ov-status-row-name">{s.name}</span>
                      <span className="ov-status-row-value" style={{ color: barColor }}>
                        {s.count}<span className="ov-status-row-pct">({pct}%)</span>
                      </span>
                    </div>
                    <div className="ov-status-row-track">
                      <div className="ov-status-row-fill" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
              <div className="ov-status-total">
                <Box size={13} />
                <span>Tổng: <strong>{kpi.totalContainers}</strong> container</span>
              </div>
            </div>
          </div>

          {/* Warehouse capacity summary */}
          <div className="ov-dash-card">
            <div className="ov-dash-card-header">
              <CheckCircle size={18} className="ov-dash-card-icon" />
              <h3>Dung lượng theo kho</h3>
            </div>
            <div className="ov-wh-cap-list">
              {(() => {
                const grouped = new Map<string, { capacity: number; occupied: number }>();
                zoneOccupancy.forEach((z) => {
                  const cur = grouped.get(z.yardName) ?? { capacity: 0, occupied: 0 };
                  cur.capacity += z.capacitySlots;
                  cur.occupied += z.occupiedSlots;
                  grouped.set(z.yardName, cur);
                });
                return Array.from(grouped.entries())
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([name, d]) => {
                    const pct = d.capacity > 0 ? Math.round((d.occupied / d.capacity) * 100) : 0;
                    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
                    return (
                      <div key={name} className="ov-wh-cap-item">
                        <div className="ov-wh-cap-head">
                          <span className="ov-wh-cap-name">{name}</span>
                          <span className="ov-wh-cap-pct" style={{ color }}>{pct}%</span>
                        </div>
                        <div className="ov-wh-cap-track">
                          <div className="ov-wh-cap-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="ov-wh-cap-counts">
                          <span>{d.occupied} đã dùng</span>
                          <span>{d.capacity - d.occupied} trống</span>
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        </div>

        {/* ── Zone detail table ── */}
        <div className="ov-dash-card">
          <div className="ov-dash-card-header">
            <BarChart3 size={18} className="ov-dash-card-icon" />
            <h3>Chi tiết theo khu vực</h3>
          </div>
          <div className="ov-zone-table-wrap">
            <table className="ov-zone-table">
              <thead>
                <tr>
                  <th>Kho</th>
                  <th>Zone</th>
                  <th className="ov-num">Sức chứa</th>
                  <th className="ov-num">Đã dùng</th>
                  <th className="ov-num">Trống</th>
                  <th className="ov-num">Tỷ lệ</th>
                  <th className="ov-bar-cell"></th>
                </tr>
              </thead>
              <tbody>
                {[...zoneOccupancy]
                  .sort((a, b) => a.yardName.localeCompare(b.yardName) || a.zoneName.localeCompare(b.zoneName))
                  .map((z) => {
                    const pct = Math.round(z.occupancyRate * 100);
                    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
                    const empty = z.capacitySlots - z.occupiedSlots;
                    return (
                      <tr key={z.zoneId}>
                        <td className="ov-yard-name">{z.yardName}</td>
                        <td className="ov-zone-cell">{z.zoneName}</td>
                        <td className="ov-num ov-zone-cell">{z.capacitySlots}</td>
                        <td className="ov-num" style={{ fontWeight: 600 }}>{z.occupiedSlots}</td>
                        <td className={`ov-num ${empty <= 5 ? 'ov-empty-low' : 'ov-zone-cell'}`}>{empty}</td>
                        <td className="ov-num ov-pct-cell" style={{ color }}>{pct}%</td>
                        <td className="ov-bar-cell">
                          <div className="ov-zone-table-mini-bar">
                            <div className="ov-zone-table-mini-fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
