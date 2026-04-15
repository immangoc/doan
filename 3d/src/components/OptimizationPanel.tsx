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
import { useState, useMemo, useSyncExternalStore, useEffect } from 'react';
import { ChevronLeft, X, Target, ArrowRightLeft, BarChart2 } from 'lucide-react';
import { subscribeOccupancy, getOccupancyData, getSlotOccupancy, isOccupancyFetched } from '../store/occupancyStore';
import type { OccupancyMap } from '../store/occupancyStore';
import {
  fetchRelocationRecommendations,
  relocateContainer,
  swapContainers,
} from '../services/relocationService';
import type { RelocationRecommendation, RelocateParams } from '../services/relocationService';
import type { WHType, PreviewPosition } from '../data/warehouse';
import { getCachedYards } from '../services/yardService';
import { getSlotIdByCoords, subscribeYard, getYardData, getZoneDims, getZoneGrid, getZoneNames } from '../store/yardStore';
import { normalizeRowPairAnchorRow1Based } from '../utils/footprint';
import './OptimizationPanel.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContainerEntry {
  containerId:   string;
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
  initialContainerCode?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function listContainersFromMap(map: OccupancyMap, filterWhType: WHType): ContainerEntry[] {
  const seen   = new Set<string>();
  const result: ContainerEntry[] = [];
  for (const [key, occ] of map.entries()) {
    if (!occ.containerCode) continue;
    if (seen.has(occ.containerCode)) continue;
    const parts = key.split('/');
    if (parts[0] !== filterWhType) continue;
    seen.add(occ.containerCode);
    result.push({
      containerId:   occ.containerCode,
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
  initialContainerCode,
}: OptimizationPanelProps) {
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const occupancyReady = isOccupancyFetched();
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const containers   = useMemo(
    () => listContainersFromMap(occupancyMap, warehouseType),
    [occupancyMap, warehouseType],
  );

  const [step, setStep]               = useState<OptStep>('select');
  const [source, setSource]           = useState<ContainerEntry | null>(null);
  const [swapTarget, setSwapTarget]   = useState<ContainerEntry | null>(null);
  const [suggestions, setSuggestions] = useState<RelocationRecommendation[]>([]);
  const [selected, setSelected]       = useState<RelocationRecommendation | null>(null);
  const [useManualTarget, setUseManualTarget] = useState(false);
  const [manualZone, setManualZone] = useState<string>('Zone A');
  const [manualTier, setManualTier] = useState<number>(1);
  const [manualRow, setManualRow] = useState<number>(1); // 1-based
  const [manualBay, setManualBay] = useState<number>(1); // 1-based
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  useEffect(() => {
    if (!initialContainerCode) return;
    if (step !== 'select') return;
    const hit = containers.find((c) => c.containerCode === initialContainerCode);
    if (hit) {
      handleSelectSource(hit);
      setUseManualTarget(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContainerCode, step, containers]);

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
    setUseManualTarget(false);
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
      // Initialize manual target to current zone/tier for convenience
      setManualZone(ctn.zoneName || 'Zone A');
      setManualTier(Math.max(1, ctn.tier || 1));
      setManualRow(Math.max(1, (ctn.row ?? 0) + 1));
      setManualBay(Math.max(1, (ctn.col ?? 0) + 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải gợi ý vị trí');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSuggestion(rec: RelocationRecommendation) {
    setSelected(rec);
    setUseManualTarget(false);
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

  // ── Manual relocate flow ────────────────────────────────────────────────────

  const zoneOptions = useMemo(() => {
    const names = getZoneNames(allYards, warehouseType);
    return names.length > 0 ? names : ['Zone A', 'Zone B', 'Zone C'];
  }, [allYards, warehouseType]);

  const zoneDims = useMemo(() => getZoneDims(allYards, warehouseType, manualZone), [allYards, warehouseType, manualZone]);
  const zoneGrid = useMemo(() => getZoneGrid(allYards, warehouseType, manualZone), [allYards, warehouseType, manualZone]);

  function normalize40ftRow(row: number): number {
    return normalizeRowPairAnchorRow1Based(row);
  }

  function checkManualTarget(): { ok: boolean; reason?: string; slotId?: number; whType?: WHType } {
    if (!occupancyReady) return { ok: false, reason: 'Chưa tải dữ liệu chiếm chỗ (bấm Làm mới để đồng bộ)' };
    if (!source) return { ok: false, reason: 'Chưa chọn container nguồn' };
    const { rows, cols, maxTier } = zoneDims;
    if (!rows || !cols) return { ok: false, reason: 'Zone chưa có dữ liệu slot' };
    if (manualTier < 1 || manualTier > (maxTier || 3)) return { ok: false, reason: 'Tầng không hợp lệ' };

    const is40 = source.sizeType === '40ft';
    const row1 = manualRow;
    const bay1 = manualBay;
    const rowAnchor = is40 ? normalize40ftRow(row1) : row1;
    if (row1 < 1 || row1 > rows) return { ok: false, reason: 'Row không hợp lệ' };
    if (bay1 < 1 || bay1 > cols) return { ok: false, reason: 'Bay không hợp lệ' };

    // Area rule
    if (is40 && bay1 <= 4) return { ok: false, reason: '40ft chỉ ở khu 40ft (bay ≥ 5)' };

    // Existence
    if (!zoneGrid[rowAnchor - 1]?.[bay1 - 1]) return { ok: false, reason: 'Ô không tồn tại' };
    if (is40 && !zoneGrid[rowAnchor /* row+1 */]?.[bay1 - 1]) return { ok: false, reason: '40ft cần 2 hàng kề nhau (row+1)' };

    // Collision
    const occ = getSlotOccupancy(occupancyMap, warehouseType, manualZone, rowAnchor - 1, bay1 - 1, manualTier);
    if (occ) return { ok: false, reason: 'Ô đã có container' };
    if (is40) {
      const occPair = getSlotOccupancy(occupancyMap, warehouseType, manualZone, rowAnchor, bay1 - 1, manualTier);
      if (occPair) return { ok: false, reason: 'Hàng kề (row+1) đã có container' };
    }

    // Support (no floating)
    if (manualTier > 1) {
      const below = getSlotOccupancy(occupancyMap, warehouseType, manualZone, rowAnchor - 1, bay1 - 1, manualTier - 1);
      if (!below) return { ok: false, reason: 'Thiếu vật đỡ ở tầng dưới' };
      if (is40) {
        const belowPair = getSlotOccupancy(occupancyMap, warehouseType, manualZone, rowAnchor, bay1 - 1, manualTier - 1);
        if (!belowPair) return { ok: false, reason: '40ft cần vật đỡ cả 2 hàng ở tầng dưới' };
      }
    }

    const slotId = getSlotIdByCoords(getCachedYards(), warehouseType, manualZone, manualTier, rowAnchor - 1, bay1 - 1);
    if (!slotId) return { ok: false, reason: 'Không resolve được slotId' };
    return { ok: true, slotId, whType: warehouseType };
  }

  useEffect(() => {
    if (!useManualTarget || !source) return;
    const is40 = source.sizeType === '40ft';
    const check = checkManualTarget();
    if (check.ok) {
      const rowAnchor = is40 ? normalize40ftRow(manualRow) : manualRow;
      onPreviewChange({
        whType: warehouseType,
        zone: manualZone,
        floor: manualTier,
        row: rowAnchor - 1,
        col: manualBay - 1,
        sizeType: source.sizeType,
        containerCode: `→ ${source.containerCode ?? ''}`,
      });
    } else {
      onPreviewChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useManualTarget, source?.containerId, manualZone, manualTier, manualRow, manualBay, warehouseType, occupancyMap]);

  async function handleConfirmManualRelocate() {
    if (!source) return;
    const check = checkManualTarget();
    if (!check.ok || !check.slotId) {
      setError(check.reason ?? 'Vị trí không hợp lệ');
      return;
    }
    const is40 = source.sizeType === '40ft';
    const rowAnchor = is40 ? normalize40ftRow(manualRow) : manualRow;
    setLoading(true);
    setError(null);
    try {
      await relocateContainer({
        containerId: source.containerId,
        rowNo: rowAnchor,
        bayNo: manualBay,
        tier: manualTier,
        slotId: check.slotId,
      });
      onPreviewChange(null);
      onSourceHighlight(undefined);
      setSuccess(`Đã dời ${source.containerCode} → ${manualZone} R${rowAnchor}C${manualBay} (T${manualTier})`);
      setStep('select');
      setSource(null);
      setSuggestions([]);
      setSelected(null);
      setUseManualTarget(false);
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`opt-btn ${!useManualTarget ? 'opt-btn-primary' : 'opt-btn-secondary'}`}
                type="button"
                onClick={() => { setUseManualTarget(false); setError(null); onPreviewChange(null); }}
              >
                Gợi ý
              </button>
              <button
                className={`opt-btn ${useManualTarget ? 'opt-btn-primary' : 'opt-btn-secondary'}`}
                type="button"
                onClick={() => { setUseManualTarget(true); setSelected(null); setError(null); }}
              >
                Thủ công
              </button>
            </div>

            {loading && <p className="opt-empty">Đang tải gợi ý...</p>}

            {!useManualTarget && !loading && !error && suggestions.length === 0 && (
              <p className="opt-empty">Không có gợi ý vị trí phù hợp.</p>
            )}

            {!useManualTarget && !loading && suggestions.map((rec) => (
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

            {!useManualTarget && selected && !loading && (
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

            {useManualTarget && source && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#fff' }}>
                {!occupancyReady && (
                  <div className="opt-error-banner">Chưa tải dữ liệu chiếm chỗ. Hãy bấm Làm mới rồi thử lại.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Zone</div>
                    <select value={manualZone} onChange={(e) => setManualZone(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      {zoneOptions.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Tầng</div>
                    <select value={String(manualTier)} onChange={(e) => setManualTier(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      {Array.from({ length: Math.max(1, zoneDims.maxTier || 3) }, (_, i) => i + 1).map((t) => <option key={t} value={t}>T{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Row</div>
                    <input type="number" min={1} max={zoneDims.rows || 99} value={manualRow} onChange={(e) => setManualRow(parseInt(e.target.value || '1', 10))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Bay</div>
                    <input type="number" min={1} max={zoneDims.cols || 99} value={manualBay} onChange={(e) => setManualBay(parseInt(e.target.value || '1', 10))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    {source.sizeType === '40ft' && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        40ft: chỉ ở khu 40ft (bay ≥ 5) và dùng bay lẻ (ô trái). Hệ thống sẽ tự normalize.
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const check = checkManualTarget();
                  if (check.ok) return null;
                  return <div className="opt-error-banner" style={{ marginTop: 10 }}>{check.reason}</div>;
                })()}

                <button
                  className="opt-submit-btn"
                  onClick={handleConfirmManualRelocate}
                  disabled={loading || !checkManualTarget().ok}
                  style={{ marginTop: 10 }}
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận dời (thủ công)'}
                </button>
              </div>
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
