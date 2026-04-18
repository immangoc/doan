/**
 * Phase 8 — Optimization Panel (Relocate & Swap).
 * Used inside Warehouse3D right-panel slot.
 *
 * Props:
 *  - onClose              → clear state and close
 *  - onPreviewChange      → show GhostContainer on target slot in 3D
 *  - onSourceHighlight    → pass source containerCode as highlightId for amber glow
 *  - warehouseType        → filter containers in current warehouse
 *  - panelClass           → outer wrapper class ('w3d-right-panel')
 */
import { useState, useMemo, useSyncExternalStore } from 'react';
import { ChevronLeft, X, Target, ArrowRightLeft, BarChart2 } from 'lucide-react';
import { subscribeOccupancy, getOccupancyData } from '../store/occupancyStore';
import type { OccupancyMap } from '../store/occupancyStore';
import {
  fetchRelocationRecommendations,
  relocateContainer,
  swapContainers,
} from '../services/relocationService';
import type { RelocationRecommendation, RelocateParams } from '../services/relocationService';
import type { WHType, PreviewPosition } from '../data/warehouse';
import './OptimizationPanel.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContainerEntry {
  containerId:   number;
  containerCode: string;
  cargoType:     string;
  sizeType:      '20ft' | '40ft';
  weight:        string;
  whType:        string;
  zoneName:      string;
  row:           number;
  col:           number;
  tier:          number;
}

type OptStep = 'select' | 'suggestions' | 'swap-select';

export interface OptimizationPanelProps {
  onClose:           () => void;
  onPreviewChange:   (pos: PreviewPosition | null) => void;
  onSourceHighlight: (code: string | undefined) => void;
  warehouseType:     WHType;
  panelClass:        string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function listContainersFromMap(map: OccupancyMap, filterWhType: WHType): ContainerEntry[] {
  const seen   = new Set<number>();
  const result: ContainerEntry[] = [];
  for (const [key, occ] of map.entries()) {
    if (seen.has(occ.containerId)) continue;
    const parts = key.split('/');
    if (parts[0] !== filterWhType) continue;
    seen.add(occ.containerId);
    result.push({
      containerId:   occ.containerId,
      containerCode: occ.containerCode,
      cargoType:     occ.cargoType,
      sizeType:      occ.sizeType,
      weight:        occ.weight,
      whType:        parts[0],
      zoneName:      parts[1],
      row:           Number(parts[2]),
      col:           Number(parts[3]),
      tier:          Number(parts[4]),
    });
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OptimizationPanel({
  onClose,
  onPreviewChange,
  onSourceHighlight,
  warehouseType,
  panelClass,
}: OptimizationPanelProps) {
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const containers   = useMemo(
    () => listContainersFromMap(occupancyMap, warehouseType),
    [occupancyMap, warehouseType],
  );

  const [step, setStep]               = useState<OptStep>('select');
  const [source, setSource]           = useState<ContainerEntry | null>(null);
  const [swapTarget, setSwapTarget]   = useState<ContainerEntry | null>(null);
  const [suggestions, setSuggestions] = useState<RelocationRecommendation[]>([]);
  const [selected, setSelected]       = useState<RelocationRecommendation | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  function clearAndClose() {
    onPreviewChange(null);
    onSourceHighlight(undefined);
    onClose();
  }

  function goBack() {
    setError(null);
    if (step === 'suggestions') {
      setStep('select');
      setSource(null);
      setSuggestions([]);
      setSelected(null);
      onPreviewChange(null);
      onSourceHighlight(undefined);
    } else if (step === 'swap-select') {
      setStep('select');
      setSwapTarget(null);
      onSourceHighlight(undefined);
    }
  }

  // ── Relocate flow ────────────────────────────────────────────────────────────

  async function handleSelectSource(ctn: ContainerEntry) {
    setSource(ctn);
    onSourceHighlight(ctn.containerCode);
    onPreviewChange(null);
    setSelected(null);
    setError(null);
    setSuccess(null);
    setLoading(true);
    setStep('suggestions');
    try {
      const recs = await fetchRelocationRecommendations(
        ctn.containerId,
        ctn.cargoType,
        ctn.weight,
        ctn.sizeType,
      );
      setSuggestions(recs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải gợi ý vị trí');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSuggestion(rec: RelocationRecommendation) {
    setSelected(rec);
    // Show ghost at target slot in 3D scene
    onPreviewChange({
      whType:        rec.whType,
      zone:          rec.zone,
      floor:         rec.floor,
      row:           rec.row,
      col:           rec.col,
      sizeType:      rec.sizeType,
      containerCode: `→ ${source?.containerCode ?? ''}`,
    });
  }

  async function handleConfirmRelocate() {
    if (!source || !selected) return;
    setLoading(true);
    setError(null);
    try {
      const params: RelocateParams = {
        containerId: source.containerId,
        rowNo:       selected.row + 1,
        bayNo:       selected.col + 1,
        tier:        selected.floor,
        slotId:      selected.slotId,
        blockId:     selected.blockId,
      };
      await relocateContainer(params);
      onPreviewChange(null);
      onSourceHighlight(undefined);
      setSuccess(`Đã dời ${source.containerCode} → ${selected.zone} ${selected.slot}`);
      setStep('select');
      setSource(null);
      setSuggestions([]);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dời container thất bại');
    } finally {
      setLoading(false);
    }
  }

  // ── Swap flow ────────────────────────────────────────────────────────────────

  function handleStartSwap(ctn: ContainerEntry) {
    setSource(ctn);
    onSourceHighlight(ctn.containerCode);
    setSwapTarget(null);
    setError(null);
    setSuccess(null);
    setStep('swap-select');
  }

  async function handleConfirmSwap() {
    if (!source || !swapTarget) return;
    setLoading(true);
    setError(null);
    try {
      await swapContainers(source.containerId, swapTarget.containerId);
      onSourceHighlight(undefined);
      setSuccess(`Hoán đổi ${source.containerCode} ↔ ${swapTarget.containerCode} thành công`);
      setStep('select');
      setSource(null);
      setSwapTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hoán đổi thất bại');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const titleMap: Record<OptStep, string> = {
    'select':      'Tối ưu hóa vị trí',
    'suggestions': 'Gợi ý vị trí mới',
    'swap-select': 'Chọn container hoán đổi',
  };

  return (
    <div className={panelClass} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="opt-header">
        <button className="opt-back-btn" onClick={step === 'select' ? clearAndClose : goBack}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="opt-title">{titleMap[step]}</h2>
        <button className="opt-close-btn" onClick={clearAndClose}><X size={16} /></button>
      </div>

      {/* ── Body ── */}
      <div className="opt-body">

        {success && <div className="opt-success-banner">✓ {success}</div>}
        {error   && <div className="opt-error-banner">{error}</div>}

        {/* ── Select source container ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            <p className="opt-hint">
              Chọn container để tìm vị trí tối ưu hơn (<Target size={11} style={{ verticalAlign: 'middle' }} /> Dời)
              hoặc hoán đổi với container khác (<ArrowRightLeft size={11} style={{ verticalAlign: 'middle' }} /> Đổi).
            </p>

            {containers.length === 0 && (
              <p className="opt-empty">
                {occupancyMap.size === 0
                  ? 'Chưa tải dữ liệu container. Vui lòng đợi...'
                  : 'Không có container trong kho này.'}
              </p>
            )}

            <div className="opt-list">
              {containers.map((ctn) => (
                <div key={ctn.containerId} className="opt-item">
                  <div className="opt-item-info">
                    <span className="opt-item-code">
                      {ctn.containerCode || `CTN-${ctn.containerId}`}
                    </span>
                    <span className="opt-item-meta">
                      {ctn.cargoType || '—'} · {ctn.zoneName} T{ctn.tier}
                    </span>
                  </div>
                  <div className="opt-item-actions">
                    <button
                      className="opt-btn opt-btn-primary"
                      onClick={() => handleSelectSource(ctn)}
                      title="Tìm vị trí tối ưu hơn"
                    >
                      <Target size={12} />
                      Dời
                    </button>
                    <button
                      className="opt-btn opt-btn-secondary"
                      onClick={() => handleStartSwap(ctn)}
                      title="Hoán đổi với container khác"
                    >
                      <ArrowRightLeft size={12} />
                      Đổi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Suggestions list ────────────────────────────────────────────── */}
        {step === 'suggestions' && (
          <>
            {source && (
              <div className="opt-source-card">
                <span className="opt-source-label">Container cần dời</span>
                <span className="opt-source-code">{source.containerCode || `CTN-${source.containerId}`}</span>
                <span className="opt-source-meta">
                  {source.zoneName} · Tầng {source.tier} · {source.cargoType}
                </span>
              </div>
            )}

            {loading && <p className="opt-empty">Đang tải gợi ý...</p>}

            {!loading && !error && suggestions.length === 0 && (
              <p className="opt-empty">Không có gợi ý vị trí phù hợp.</p>
            )}

            {!loading && suggestions.map((rec) => (
              <div
                key={rec.rank}
                className={`opt-rec-card ${selected?.rank === rec.rank ? 'opt-rec-selected' : ''}`}
                onClick={() => handleSelectSuggestion(rec)}
              >
                <div className="opt-rec-rank">#{rec.rank}</div>
                <div className="opt-rec-info">
                  <div className="opt-rec-slot">{rec.zone} · Tầng {rec.floor} · {rec.slot}</div>
                  <div className="opt-rec-meta">
                    <span className="opt-rec-efficiency">
                      <BarChart2 size={11} /> {rec.efficiency}%
                    </span>
                    <span className="opt-rec-moves">{rec.moves} lần đảo</span>
                  </div>
                </div>
                {selected?.rank === rec.rank && <div className="opt-rec-check">✓</div>}
              </div>
            ))}

            {selected && !loading && (
              <button
                className="opt-submit-btn"
                onClick={handleConfirmRelocate}
                disabled={loading}
              >
                {loading
                  ? 'Đang xử lý...'
                  : `Xác nhận dời → ${selected.zone} ${selected.slot}`}
              </button>
            )}
          </>
        )}

        {/* ── Swap target selection ────────────────────────────────────────── */}
        {step === 'swap-select' && (
          <>
            {source && (
              <div className="opt-source-card">
                <span className="opt-source-label">Container A (nguồn)</span>
                <span className="opt-source-code">{source.containerCode || `CTN-${source.containerId}`}</span>
                <span className="opt-source-meta">{source.zoneName} · Tầng {source.tier}</span>
              </div>
            )}

            <p className="opt-hint">Chọn container B để hoán đổi vị trí với container A:</p>

            <div className="opt-list">
              {containers
                .filter((c) => c.containerId !== source?.containerId)
                .map((ctn) => (
                  <div
                    key={ctn.containerId}
                    className={`opt-item ${swapTarget?.containerId === ctn.containerId ? 'opt-item-selected' : ''}`}
                    onClick={() => setSwapTarget(ctn)}
                  >
                    <div className="opt-item-info">
                      <span className="opt-item-code">
                        {ctn.containerCode || `CTN-${ctn.containerId}`}
                      </span>
                      <span className="opt-item-meta">
                        {ctn.cargoType || '—'} · {ctn.zoneName} T{ctn.tier}
                      </span>
                    </div>
                    {swapTarget?.containerId === ctn.containerId && (
                      <span style={{ color: '#1e3a8a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                ))}
            </div>

            {swapTarget && (
              <button
                className="opt-submit-btn"
                onClick={handleConfirmSwap}
                disabled={loading}
              >
                {loading
                  ? 'Đang xử lý...'
                  : `Hoán đổi: ${source?.containerCode} ↔ ${swapTarget.containerCode}`}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
}
