/**
 * Phase 8 — Smart Optimization Panel.
 *
 * New flow:
 *  1. On mount → fetch all IN_YARD containers
 *  2. Filter containers due for gate-out today (expectedExitDate ≤ today)
 *  3. Detect which have blockers above them (higher tier in same slot)
 *  4. For each blocker → call ML to find optimal relocation destination
 *  5. Show the optimization plan → user confirms → execute all relocations
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, X, Zap, Package, ArrowRight, CheckCircle,
  AlertTriangle, Loader2, RefreshCw, Calendar,
} from 'lucide-react';
import { searchInYardContainers } from '../services/gateOutService';
import type { InYardContainer } from '../services/gateOutService';
import {
  fetchRelocationRecommendations,
  relocateContainer,
} from '../services/relocationService';
import type { RelocationRecommendation, RelocateParams } from '../services/relocationService';
import type { WHType, PreviewPosition } from '../data/warehouse';
import './OptimizationPanel.css';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Container that needs to be gate-out today but has blockers */
interface BlockedContainer {
  container: InYardContainer;
  blockers: InYardContainer[];   // containers above it in same slot
}

/** A planned relocation move for a single blocker */
interface PlannedMove {
  blocker: InYardContainer;
  targetContainer: InYardContainer;   // which exit container it's blocking
  recommendation: RelocationRecommendation | null;
  status: 'pending' | 'loading' | 'ready' | 'executing' | 'done' | 'error';
  error?: string;
}

type OptStep = 'analyzing' | 'plan' | 'executing' | 'done';

export interface OptimizationPanelProps {
  onClose:           () => void;
  onPreviewChange:   (pos: PreviewPosition | null) => void;
  onSourceHighlight: (code: string | undefined) => void;
  warehouseType:     WHType;
  panelClass:        string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Group containers by slot key (zone + row + bay) */
function slotKey(c: InYardContainer): string {
  return `${c.zone}/${c.rowNo}/${c.bayNo}`;
}

/** Find containers needing exit today that have blockers above them */
function findBlockedContainers(all: InYardContainer[]): BlockedContainer[] {
  const today = todayStr();

  // Group by slot
  const bySlot = new Map<string, InYardContainer[]>();
  for (const c of all) {
    if (c.rowNo == null || c.bayNo == null || c.tier == null) continue;
    const key = slotKey(c);
    const arr = bySlot.get(key) ?? [];
    arr.push(c);
    bySlot.set(key, arr);
  }

  const results: BlockedContainer[] = [];

  for (const [, group] of bySlot) {
    // Sort by tier ascending
    group.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));

    // Find containers due today (or overdue)
    for (const c of group) {
      if (!c.expectedExitDate) continue;
      if (c.expectedExitDate > today) continue; // not due yet

      // Containers above this one in the same slot
      const blockers = group.filter((b) => (b.tier ?? 0) > (c.tier ?? 0));
      if (blockers.length > 0) {
        results.push({ container: c, blockers });
      }
    }
  }

  // Sort by exit date (most urgent first)
  results.sort((a, b) => a.container.expectedExitDate.localeCompare(b.container.expectedExitDate));
  return results;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OptimizationPanel({
  onClose,
  onPreviewChange,
  onSourceHighlight,
  panelClass,
}: OptimizationPanelProps) {
  const [step, setStep] = useState<OptStep>('analyzing');
  const [blocked, setBlocked] = useState<BlockedContainer[]>([]);
  const [moves, setMoves] = useState<PlannedMove[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executingIdx, setExecutingIdx] = useState(-1);
  const [doneCount, setDoneCount] = useState(0);
  const [allContainers, setAllContainers] = useState<InYardContainer[]>([]);

  // ── Step 1: Analyze ─────────────────────────────────────────────────────────

  const analyze = useCallback(async () => {
    setStep('analyzing');
    setError(null);
    setMoves([]);
    setBlocked([]);
    setDoneCount(0);
    setExecutingIdx(-1);

    try {
      // Fetch all IN_YARD containers
      const containers = await searchInYardContainers('');
      setAllContainers(containers);

      // Find blocked containers needing exit today
      const blockedList = findBlockedContainers(containers);
      setBlocked(blockedList);

      if (blockedList.length === 0) {
        setStep('plan');
        return;
      }

      // For each blocker → get ML recommendation
      const plannedMoves: PlannedMove[] = [];
      const seenBlockers = new Set<string>();

      for (const bc of blockedList) {
        // Process blockers top-down (highest tier first)
        const sorted = [...bc.blockers].sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
        for (const blocker of sorted) {
          if (seenBlockers.has(blocker.containerId)) continue;
          seenBlockers.add(blocker.containerId);

          plannedMoves.push({
            blocker,
            targetContainer: bc.container,
            recommendation: null,
            status: 'loading',
          });
        }
      }

      setMoves([...plannedMoves]);

      // Fetch ML recommendations for each blocker
      for (let i = 0; i < plannedMoves.length; i++) {
        const move = plannedMoves[i];
        try {
          const sizeType = move.blocker.containerType?.toUpperCase().includes('40') ? '40ft' : '20ft';
          const recs = await fetchRelocationRecommendations(
            move.blocker.containerId,
            move.blocker.cargoType,
            move.blocker.grossWeight || '0',
            sizeType as '20ft' | '40ft',
          );
          move.recommendation = recs.length > 0 ? recs[0] : null;
          move.status = recs.length > 0 ? 'ready' : 'error';
          if (recs.length === 0) move.error = 'ML không tìm được vị trí phù hợp';
        } catch (e) {
          move.status = 'error';
          move.error = e instanceof Error ? e.message : 'Lỗi gọi ML';
        }
        setMoves([...plannedMoves]);
      }

      setStep('plan');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi phân tích kho');
      setStep('plan');
    }
  }, []);

  useEffect(() => { analyze(); }, [analyze]);

  // ── Step 2: Execute all moves ───────────────────────────────────────────────

  async function executeAll() {
    const readyMoves = moves.filter((m) => m.status === 'ready' && m.recommendation);
    if (readyMoves.length === 0) return;

    setStep('executing');
    let done = 0;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (move.status !== 'ready' || !move.recommendation) continue;

      setExecutingIdx(i);
      move.status = 'executing';
      setMoves([...moves]);

      try {
        const rec = move.recommendation;
        const params: RelocateParams = {
          containerId: move.blocker.containerId,
          rowNo:   rec.row + 1,
          bayNo:   rec.col + 1,
          tier:    rec.floor,
          slotId:  rec.slotId,
          blockId: rec.blockId,
        };
        await relocateContainer(params);
        move.status = 'done';
        done++;
      } catch (e) {
        move.status = 'error';
        move.error = e instanceof Error ? e.message : 'Lỗi dời container';
      }
      setMoves([...moves]);
      setDoneCount(done);
    }

    setExecutingIdx(-1);
    setStep('done');
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const readyCount = moves.filter((m) => m.status === 'ready').length;
  const errorCount = moves.filter((m) => m.status === 'error').length;
  const totalDueToday = blocked.length;

  return (
    <div className={panelClass} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div className="opt-header">
        <button className="opt-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="opt-title">
          <Zap size={16} style={{ verticalAlign: 'middle', marginRight: 4, color: '#f59e0b' }} />
          Tối ưu hóa vị trí
        </h2>
        <button className="opt-close-btn" onClick={onClose}><X size={16} /></button>
      </div>

      {/* ── Body ── */}
      <div className="opt-body">

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <div className="opt-analyzing">
            <Loader2 size={32} className="opt-spin" />
            <p className="opt-analyzing-text">Đang phân tích kho bãi…</p>
            <p className="opt-analyzing-sub">Lọc container cần xuất hôm nay & tìm vị trí tối ưu bằng ML</p>
          </div>
        )}

        {/* ── Plan / Results ── */}
        {(step === 'plan' || step === 'executing' || step === 'done') && (
          <>
            {/* Summary bar */}
            <div className="opt-summary">
              <div className="opt-summary-item">
                <Calendar size={14} />
                <span>{todayStr()}</span>
              </div>
              <div className="opt-summary-item">
                <Package size={14} />
                <span>{allContainers.length} container trong kho</span>
              </div>
            </div>

            {error && <div className="opt-error-banner">{error}</div>}

            {/* No optimization needed */}
            {totalDueToday === 0 && !error && (
              <div className="opt-empty-state">
                <CheckCircle size={40} style={{ color: '#16a34a', marginBottom: 8 }} />
                <p className="opt-empty-title">Kho đã tối ưu!</p>
                <p className="opt-empty-sub">
                  Không có container nào cần xuất hôm nay bị chặn bởi container khác.
                </p>
              </div>
            )}

            {/* Blocked containers summary */}
            {totalDueToday > 0 && (
              <>
                <div className="opt-alert-bar">
                  <AlertTriangle size={16} />
                  <span>
                    <strong>{totalDueToday}</strong> container cần xuất hôm nay bị chặn
                    — cần đảo <strong>{moves.length}</strong> container
                  </span>
                </div>

                {/* Move list */}
                <div className="opt-move-list">
                  {moves.map((move, idx) => (
                    <div
                      key={idx}
                      className={`opt-move-card opt-move-${move.status}`}
                      onMouseEnter={() => {
                        onSourceHighlight(move.blocker.containerCode);
                        if (move.recommendation) {
                          onPreviewChange({
                            whType: move.recommendation.whType,
                            zone: move.recommendation.zone,
                            floor: move.recommendation.floor,
                            row: move.recommendation.row,
                            col: move.recommendation.col,
                            sizeType: move.recommendation.sizeType,
                            containerCode: `→ ${move.blocker.containerCode}`,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        onSourceHighlight(undefined);
                        onPreviewChange(null);
                      }}
                    >
                      {/* Move number badge */}
                      <div className="opt-move-badge">
                        {move.status === 'done' ? <CheckCircle size={14} /> :
                         move.status === 'executing' ? <Loader2 size={14} className="opt-spin" /> :
                         move.status === 'error' ? <AlertTriangle size={14} /> :
                         <span>{idx + 1}</span>}
                      </div>

                      {/* Move details */}
                      <div className="opt-move-info">
                        <div className="opt-move-container">
                          {move.blocker.containerCode}
                        </div>
                        <div className="opt-move-reason">
                          Chặn {move.targetContainer.containerCode} (T{move.blocker.tier} → T{move.targetContainer.tier})
                        </div>

                        {/* Loading state */}
                        {move.status === 'loading' && (
                          <div className="opt-move-dest opt-move-loading">
                            <Loader2 size={11} className="opt-spin" /> ML đang phân tích…
                          </div>
                        )}

                        {/* Destination */}
                        {move.recommendation && move.status !== 'loading' && (
                          <div className="opt-move-dest">
                            <ArrowRight size={11} />
                            <span>
                              {move.recommendation.zone} · R{move.recommendation.row + 1}B{move.recommendation.col + 1} / T{move.recommendation.floor}
                            </span>
                          </div>
                        )}

                        {/* Error */}
                        {move.status === 'error' && move.error && (
                          <div className="opt-move-error-text">{move.error}</div>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className={`opt-move-status opt-status-${move.status}`}>
                        {move.status === 'ready' && 'Sẵn sàng'}
                        {move.status === 'done' && 'Xong'}
                        {move.status === 'executing' && 'Đang chạy'}
                        {move.status === 'error' && 'Lỗi'}
                        {move.status === 'loading' && '...'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Execute button */}
                {step === 'plan' && readyCount > 0 && (
                  <button className="opt-submit-btn" onClick={executeAll}>
                    <Zap size={15} />
                    Thực hiện {readyCount} lệnh đảo
                  </button>
                )}

                {/* Done state */}
                {step === 'done' && (
                  <div className="opt-done-bar">
                    <CheckCircle size={18} />
                    <span>Đã hoàn thành {doneCount}/{moves.length} lệnh đảo</span>
                    {errorCount > 0 && <span className="opt-done-error">({errorCount} lỗi)</span>}
                  </div>
                )}
              </>
            )}

            {/* Refresh button */}
            {(step === 'plan' || step === 'done') && (
              <button
                className="opt-refresh-btn"
                onClick={() => { onPreviewChange(null); onSourceHighlight(undefined); analyze(); }}
              >
                <RefreshCw size={14} />
                Phân tích lại
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
