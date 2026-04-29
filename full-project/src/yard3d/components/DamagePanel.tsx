/**
 * DamagePanel — quản lý quy trình báo hỏng 2 pha.
 *
 * Pha 1: form tạo damage_report (POST /admin/damage/report) — container đã
 *   chọn nhấp nháy vàng, chưa di chuyển vật lý.
 * Pha 2: từ panel này admin chọn "Xem kế hoạch" -> "Chuyển vào kho hỏng".
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { X, AlertTriangle, ArrowRight, Trash2, Eye } from 'lucide-react';
import {
  reportDamage,
  previewMove,
  moveToDamagedYard,
  cancelDamage,
  type DamageReport,
  type RelocationPlan,
} from '../services/damageService';
import {
  subscribeDamage,
  getPendingDamages,
  refreshDamages,
  markPendingOptimistic,
  clearPendingOptimistic,
} from '../store/damageStore';
import './DamagePanel.css';

export interface DamagePanelProps {
  onClose:    () => void;
  panelClass: string;
  /** Container đang được chọn để báo hỏng (Pha 1). Null = chỉ hiện danh sách. */
  selectedContainer?: {
    containerCode: string;
    cargoType?:    string;
    zone?:         string;
    floor?:        number;
    slot?:         string;
  } | null;
  onReported?: () => void;
}

type Severity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export function DamagePanel({ onClose, panelClass, selectedContainer, onReported }: DamagePanelProps) {
  const pending = useSyncExternalStore(subscribeDamage, getPendingDamages);

  const [severity, setSeverity] = useState<Severity>('MAJOR');
  const [reason, setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // Per-row state for previews / relocate
  const [planByCode, setPlanByCode] = useState<Record<string, RelocationPlan>>({});
  const [busyCode, setBusyCode]     = useState<string | null>(null);

  useEffect(() => { refreshDamages(); }, []);
  // Slow polling so other admins see updates
  useEffect(() => {
    const id = window.setInterval(() => { refreshDamages(); }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  // ─── Pha 1: submit report ────────────────────────────────────────────────

  async function handleReport() {
    if (!selectedContainer) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const report = await reportDamage({
        containerId: selectedContainer.containerCode,
        severity,
        reason: reason.trim() || undefined,
      });
      markPendingOptimistic(report);
      setSuccess(`Đã báo hỏng ${report.containerCode}. Container đang nhấp nháy trong sơ đồ.`);
      setReason('');
      onReported?.();
      // Refresh list to pick up server-side metadata
      await refreshDamages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Báo hỏng thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Pha 2: preview + execute ────────────────────────────────────────────

  async function handlePreview(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      const plan = await previewMove(code);
      setPlanByCode((prev) => ({ ...prev, [code]: plan }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được kế hoạch');
    } finally {
      setBusyCode(null);
    }
  }

  async function handleMove(code: string) {
    setBusyCode(code);
    setError(null);
    setSuccess(null);
    try {
      await moveToDamagedYard(code);
      clearPendingOptimistic(code);
      setPlanByCode((prev) => { const n = { ...prev }; delete n[code]; return n; });
      setSuccess(`Đã chuyển ${code} vào kho hỏng.`);
      await refreshDamages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chuyển kho hỏng thất bại');
    } finally {
      setBusyCode(null);
    }
  }

  async function handleCancel(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      await cancelDamage(code);
      clearPendingOptimistic(code);
      await refreshDamages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Huỷ báo hỏng thất bại');
    } finally {
      setBusyCode(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={panelClass} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="dmg-header">
        <AlertTriangle size={18} color="#d97706" />
        <h2 className="dmg-title">Quản lý kho hỏng</h2>
        <button className="dmg-close-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="dmg-body">
        {error   && <div className="dmg-error">{error}</div>}
        {success && <div className="dmg-success">{success}</div>}

        {/* Pha 1 form */}
        {selectedContainer && (
          <div className="dmg-item" style={{ borderLeftColor: '#dc2626', background: '#fef2f2' }}>
            <div className="dmg-row">
              <span className="dmg-code">Báo hỏng container</span>
            </div>
            <div className="dmg-meta">
              <b>{selectedContainer.containerCode}</b>
              {selectedContainer.zone ? ` · ${selectedContainer.zone}` : ''}
              {selectedContainer.floor ? ` · Tầng ${selectedContainer.floor}` : ''}
              {selectedContainer.slot  ? ` · ${selectedContainer.slot}`  : ''}
            </div>

            <div className="dmg-form-row">
              <label>Mức độ hỏng</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                <option value="MINOR">Nhẹ — vẫn có thể sử dụng</option>
                <option value="MAJOR">Nặng — cần sửa chữa</option>
                <option value="CRITICAL">Nghiêm trọng — không thể sử dụng</option>
              </select>
            </div>

            <div className="dmg-form-row">
              <label>Mô tả hư hỏng</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vd. Vỏ container móp nặng cạnh phía Bắc, có vết nứt..."
                maxLength={500}
              />
            </div>

            <div className="dmg-actions">
              <button className="dmg-btn dmg-btn-ghost" onClick={onClose} disabled={submitting}>Huỷ</button>
              <button
                className="dmg-btn dmg-btn-primary"
                onClick={handleReport}
                disabled={submitting}
              >
                {submitting ? 'Đang gửi...' : 'Báo hỏng'}
              </button>
            </div>
          </div>
        )}

        {/* Danh sách pending / relocating */}
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginTop: '0.4rem' }}>
          Container chờ chuyển ({pending.length})
        </div>

        {pending.length === 0 && (
          <p className="dmg-empty">Chưa có container nào trong danh sách.</p>
        )}

        {pending.map((r) => {
          const plan = planByCode[r.containerCode];
          const isRelocating = r.reportStatus === 'RELOCATING';
          return (
            <div key={r.reportId} className={`dmg-item ${isRelocating ? 'relocating' : ''}`}>
              <div className="dmg-row">
                <span className="dmg-code">{r.containerCode}</span>
                <span className={`dmg-badge dmg-badge-${(r.severity ?? 'major').toLowerCase()}`}>
                  {r.severity ?? 'MAJOR'}
                </span>
              </div>
              <div className="dmg-meta">
                {r.cargoTypeName && `${r.cargoTypeName} · `}
                {r.currentZone   && `${r.currentZone}`}
                {r.currentTier   && ` · Tầng ${r.currentTier}`}
                {' · '}
                <span className={`dmg-badge dmg-badge-${r.reportStatus.toLowerCase()}`}>
                  {r.reportStatus === 'PENDING' ? 'Đã báo' : 'Đang đảo'}
                </span>
              </div>
              {r.reason && <div className="dmg-reason">{r.reason}</div>}

              {plan && plan.feasible && (
                <div className="dmg-plan">
                  <div className="dmg-plan-title">
                    Kế hoạch ({plan.blockerCount} blocker{plan.blockerCount !== 1 ? 's' : ''}):
                  </div>
                  {plan.moves.map((m, i) => (
                    <div key={i} className="dmg-plan-step">
                      {i + 1}. <b>{m.containerId}</b>: {m.fromZone} R{m.fromRow}-B{m.fromBay} T{m.fromTier}
                      {' → '}
                      {m.toZone} R{m.toRow}-B{m.toBay} T{m.toTier}
                    </div>
                  ))}
                </div>
              )}
              {plan && !plan.feasible && (
                <div className="dmg-error">{plan.infeasibilityReason ?? 'Không khả thi'}</div>
              )}

              <div className="dmg-actions">
                <button
                  className="dmg-btn dmg-btn-ghost"
                  onClick={() => handlePreview(r.containerCode)}
                  disabled={busyCode === r.containerCode}
                  title="Xem kế hoạch đảo container"
                >
                  <Eye size={12} /> Xem KH
                </button>
                <button
                  className="dmg-btn dmg-btn-primary"
                  onClick={() => handleMove(r.containerCode)}
                  disabled={busyCode === r.containerCode || (plan != null && !plan.feasible)}
                  title="Đảo blocker và chuyển vào kho hỏng"
                >
                  <ArrowRight size={12} /> Chuyển kho hỏng
                </button>
                <button
                  className="dmg-btn dmg-btn-ghost"
                  onClick={() => handleCancel(r.containerCode)}
                  disabled={busyCode === r.containerCode || r.reportStatus !== 'PENDING'}
                  title="Huỷ báo hỏng"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
