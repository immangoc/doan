import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronLeft, ChevronRight, X, Wrench, FileEdit, CheckCircle, Eye, ArrowRight, ArrowLeft, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchStatusHistory, updateDamageDetails } from '../services/containerService';
import type { StatusHistoryEntry, DamageDetailsPayload } from '../services/containerService';
import {
  previewMove, moveToDamagedYard, cancelDamage, fetchAllDamages, returnToYard, previewReturnToYard,
  type DamageReport, type RelocationPlan, type MoveToDamagedYardPayload, type ReturnPreview,
} from '../services/damageService';
import { clearPendingOptimistic } from '../store/damageStore';
import { apiFetch } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './management.css';

const TYPE_OPTIONS = ['', '20ft', '40ft'];
const REPAIR_STATUS_OPTIONS = ['PENDING', 'REPAIRING', 'REPAIRED', 'SCRAPPED'];

function statusBadgeClass(status: string): string {
  if (status.toUpperCase() === 'DAMAGED') return 'mgmt-badge mgmt-badge-critical';
  return 'mgmt-badge mgmt-badge-neutral';
}

function repairBadgeClass(repairStatus: string): string {
  switch (repairStatus?.toUpperCase()) {
    case 'PENDING': return 'mgmt-badge mgmt-badge-warning';
    case 'REPAIRING': return 'mgmt-badge mgmt-badge-info';
    case 'REPAIRED': return 'mgmt-badge mgmt-badge-success';
    case 'SCRAPPED': return 'mgmt-badge mgmt-badge-critical';
    default: return 'mgmt-badge mgmt-badge-neutral';
  }
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function formatCurrency(val: string): string {
  if (!val || val === '0') return '—';
  const n = Number(val);
  if (isNaN(n) || n === 0) return '—';
  return `${n.toLocaleString('vi-VN')} VND`;
}

// ─── Damage Details Modal ──────────────────────────────────────────────────────
function DamageDetailsModal({ report, tariffs, onClose, onSaved }: {
  report: DamageReport;
  tariffs: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [repairStatus, setRepairStatus] = useState(report.repairStatus || '');
  const [repairDate, setRepairDate] = useState(() => {
    if (!report.repairDate) return '';
    const d = new Date(report.repairDate);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  });
  const [compensationCost, setCompensationCost] = useState(
    report.compensationCost && Number(report.compensationCost) > 0
      ? String(Number(report.compensationCost))
      : ''
  );
  const [repairCost, setRepairCost] = useState(report.repairCost ? String(report.repairCost) : '');
  const [dateToConfirm, setDateToConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto calculate compensation based on expected exit date
  function calculateCompensation(dStr: string) {
    if (!report.expectedExitDate || !dStr) {
      setCompensationCost('');
      return;
    }
    
    const repairD = new Date(dStr).setHours(0,0,0,0);
    const exitD = new Date(report.expectedExitDate).setHours(0,0,0,0);
    
    if (repairD <= exitD) {
      setCompensationCost('0');
      return;
    }
    
    // late days
    const daysLate = Math.ceil((repairD - exitD) / (1000 * 60 * 60 * 24));
    let lateFeePerDay = 0;
    
    if (daysLate >= 1 && daysLate <= 2) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_1_2')?.unitPrice || 0;
    } else if (daysLate >= 3 && daysLate <= 5) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_3_5')?.unitPrice || 0;
    } else if (daysLate > 5) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_GT_5')?.unitPrice || 0;
    }
    
    const penalty = lateFeePerDay * daysLate;
    setCompensationCost(penalty > 0 ? String(penalty) : '0');
  }

  function handleConfirmDate() {
    if (dateToConfirm) {
      setRepairDate(dateToConfirm);
      calculateCompensation(dateToConfirm);
    }
    setDateToConfirm(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: DamageDetailsPayload = {};
      if (repairStatus) payload.repairStatus = repairStatus;
      if (repairDate) payload.repairDate = new Date(repairDate).toISOString();
      if (compensationCost) payload.compensationCost = Number(compensationCost);
      if (repairCost) payload.repairCost = Number(repairCost);
      await updateDamageDetails(report.containerCode, payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mgmt-modal-overlay" onClick={onClose}>
      <div className="mgmt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="mgmt-modal-header">
          <h3 className="mgmt-modal-title">
            <FileEdit size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Cập nhật thông tin hỏng — {report.containerCode}
          </h3>
          <button className="mgmt-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Trạng thái sửa chữa
            </label>
            <select
              className="mgmt-select"
              style={{ width: '100%' }}
              value={repairStatus}
              onChange={(e) => setRepairStatus(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {REPAIR_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Ngày xuất mới (sau sửa)
            </label>
            <input
              type="date"
              className="mgmt-select"
              style={{ width: '100%' }}
              value={repairDate}
              onChange={(e) => setDateToConfirm(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Tiền hoàn cho khách (VND) - Tự tính
            </label>
            <input
              type="text"
              readOnly
              value={compensationCost ? Number(compensationCost).toLocaleString('vi-VN') : (report.expectedExitDate ? '0' : 'Không có ngày xuất (0đ)')}
              style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.88rem', backgroundColor: '#f3f4f6', color: '#111827', fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Chi phí sửa chữa container (VND)
            </label>
            <input
              type="number"
              className="mgmt-select"
              style={{ width: '100%' }}
              placeholder="Nhập số tiền..."
              value={repairCost}
              onChange={(e) => setRepairCost(e.target.value)}
              min={0}
              step="1000"
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>
          )}
        </div>

        <div className="mgmt-modal-actions">
          <button
            className="mgmt-action-btn mgmt-action-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            className="mgmt-action-btn mgmt-action-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
      {/* Date Confirm Popup */}
      {dateToConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={() => setDateToConfirm(null)}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#1e3a8a', fontWeight: 700 }}>Xác nhận tính phí</h4>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: 20, lineHeight: 1.5 }}>
              Bạn có chắc chắn lấy ngày <strong>{new Date(dateToConfirm).toLocaleDateString('vi-VN')}</strong> làm ngày dự kiến sửa xong để hệ thống đối chiếu tính phí lưu trễ không?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setDateToConfirm(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirmDate}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Status history side panel ────────────────────────────────────────────────
function HistoryPanel({ containerCode, onClose }: {
  containerCode: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStatusHistory(containerCode)
      .then((h) => { if (!cancelled) setHistory(h); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải lịch sử'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [containerCode]);

  return (
    <div className="mgmt-history-panel">
      <div className="mgmt-history-header">
        <h4 className="mgmt-history-title">Lịch sử — {containerCode}</h4>
        <button className="mgmt-history-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="mgmt-history-body">
        {loading && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Đang tải...</p>}
        {!loading && error && <p style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</p>}
        {!loading && !error && history.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Không có lịch sử trạng thái</p>
        )}
        {!loading && !error && history.map((h, idx) => (
          <div key={idx} className="mgmt-history-item">
            <div className="mgmt-history-dot" />
            <div>
              <div className="mgmt-history-status">{h.status}</div>
              <div className="mgmt-history-time">{h.changedAt}</div>
              {h.note && <div className="mgmt-history-note">{h.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Move-to-damaged-yard Modal ─────────────────────────────────────────────
function MoveToDamagedYardModal({ report, busy, tariffs, onClose, onSubmit }: {
  report: DamageReport;
  busy: boolean;
  tariffs: any[];
  onClose: () => void;
  onSubmit: (payload: MoveToDamagedYardPayload) => void;
}) {
  const [repairDate, setRepairDate] = useState('');
  const [dateToConfirm, setDateToConfirm] = useState<string | null>(null);
  const [compensation, setCompensation] = useState<string>('');
  const [repairCost, setRepairCost] = useState<string>('');
  const [note, setNote] = useState('');

  // Auto calculate compensation based on expected exit date
  function calculateCompensation(dStr: string) {
    if (!report.expectedExitDate || !dStr) {
      setCompensation('');
      return;
    }
    
    const repairD = new Date(dStr).setHours(0,0,0,0);
    const exitD = new Date(report.expectedExitDate).setHours(0,0,0,0);
    
    if (repairD <= exitD) {
      setCompensation('0');
      return;
    }
    
    // late days
    const daysLate = Math.ceil((repairD - exitD) / (1000 * 60 * 60 * 24));
    let lateFeePerDay = 0;
    
    if (daysLate >= 1 && daysLate <= 2) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_1_2')?.unitPrice || 0;
    } else if (daysLate >= 3 && daysLate <= 5) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_3_5')?.unitPrice || 0;
    } else if (daysLate > 5) {
      lateFeePerDay = tariffs.find(t => t.tariffCode === 'LATE_FEE_GT_5')?.unitPrice || 0;
    }
    
    const penalty = lateFeePerDay * daysLate;
    setCompensation(penalty > 0 ? String(penalty) : '0');
  }

  function handleConfirmDate() {
    if (dateToConfirm) {
      setRepairDate(dateToConfirm);
      calculateCompensation(dateToConfirm);
    }
    setDateToConfirm(null);
  }

  function submit() {
    onSubmit({});
  }

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 380, maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Chuyển vào kho hỏng</h3>
          <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
          Container <strong>{report.containerCode}</strong> sẽ được chuyển vào kho hỏng.
          {report.expectedExitDate ? (
            <span style={{ display: 'block', marginTop: 4, color: '#059669', fontWeight: 500 }}>
              Ngày xuất dự kiến theo đơn: {new Date(report.expectedExitDate).toLocaleDateString('vi-VN')}
            </span>
          ) : (
            <span style={{ display: 'block', marginTop: 4, color: '#dc2626', fontWeight: 500 }}>
              * Container chưa có đơn hàng / ngày xuất dự kiến.
            </span>
          )}
        </p>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
          Bạn có chắc chắn muốn duyệt và chuyển container này vào kho hỏng không?
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#1e3a8a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            {busy ? 'Đang xử lý...' : 'Xác nhận chuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Return Preview Modal ───────────────────────────────────────────────────
function ReturnPreviewModal({ report, preview, busy, onClose, onConfirm }: {
  report:  DamageReport;
  preview: ReturnPreview;
  busy:    boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const mlPct    = preview.mlScore != null    ? `${(preview.mlScore * 100).toFixed(1)}%`    : '—';
  const finalPct = preview.finalScore != null ? `${(preview.finalScore * 100).toFixed(1)}%` : '—';
  const movesPct = preview.movesNorm != null  ? `${(preview.movesNorm * 100).toFixed(1)}%`  : '—';
  const exitPct  = preview.exitNorm != null   ? `${(preview.exitNorm * 100).toFixed(1)}%`   : '—';

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
               display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 420, maxWidth: 540,
                 boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={18} /> Vị trí đề xuất bởi ML
          </h3>
          <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
          Container <strong>{report.containerCode}</strong> sẽ được chuyển về vị trí dưới đây.
          Hệ thống đã chọn vị trí tối ưu nhất dựa trên model LightGBM + heuristic stacking.
        </p>

        {/* Vị trí đề xuất */}
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, marginBottom: 8 }}>VỊ TRÍ MỚI</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem 1rem', fontSize: '0.88rem' }}>
            <div><span style={{ color: '#6b7280' }}>Kho:</span> <strong>{preview.yardName}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Zone:</span> <strong>{preview.zoneName}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Block:</span> <strong>{preview.blockName}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Tầng:</span> <strong>Tier {preview.recommendedTier}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Hàng (Row):</span> <strong>R{preview.rowNo}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Cột (Bay):</span> <strong>B{preview.bayNo}</strong></div>
          </div>
        </div>

        {/* Chỉ số ML */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, marginBottom: 8 }}>CHỈ SỐ TỐI ƯU</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.82rem', color: '#4b5563' }}>
            <div>ML score: <strong style={{ color: '#1e3a8a' }}>{mlPct}</strong></div>
            <div>Final score: <strong style={{ color: '#1e3a8a' }}>{finalPct}</strong></div>
            <div>Moves cost: <strong>{movesPct}</strong></div>
            <div>Exit distance: <strong>{exitPct}</strong></div>
            {preview.relocationsEstimated != null && (
              <div style={{ gridColumn: '1 / -1' }}>
                Dự kiến đảo: <strong>{preview.relocationsEstimated} container</strong>
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 14, fontStyle: 'italic' }}>
          ML score càng cao = vị trí càng "lành" (ít cản trở, thoáng zone, dễ xuất); final score là tổng hợp tất cả tiêu chí.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e5e7eb',
                     background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                     background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            {busy ? 'Đang chuyển...' : 'Xác nhận chuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type StatusFilter = 'ALL' | 'PENDING' | 'STORED';

function statusLabel(s: string): { text: string; cls: string } {
  switch (s) {
    case 'PENDING':    return { text: 'Đã báo hỏng',     cls: 'mgmt-badge mgmt-badge-warning' };
    case 'RELOCATING': return { text: 'Đang đảo',        cls: 'mgmt-badge mgmt-badge-info' };
    case 'STORED':     return { text: 'Trong kho hỏng',  cls: 'mgmt-badge mgmt-badge-critical' };
    default:           return { text: s,                  cls: 'mgmt-badge mgmt-badge-neutral' };
  }
}

export function Kho() {
  const user = useAuth();
  const isYardStaff = user?.role === 'YARD_STAFF';

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [tariffs, setTariffs] = useState<any[]>([]);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [selectedHistory, setSelectedHistory] = useState<DamageReport | null>(null);
  const [editingReport, setEditingReport] = useState<DamageReport | null>(null);
  const [moveTarget, setMoveTarget]       = useState<DamageReport | null>(null);
  const [returnTarget, setReturnTarget]   = useState<{ report: DamageReport; preview: ReturnPreview } | null>(null);
  const [busyCode, setBusyCode]           = useState<string | null>(null);
  const [planByCode, setPlanByCode]       = useState<Record<string, RelocationPlan>>({});
  const [bannerError, setBannerError]     = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  function reload() { setReloadKey((k) => k + 1); }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllDamages()
      .then((list) => { if (!cancelled) setReports(list); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
      
    // Fetch tariffs
    apiFetch('/admin/tariffs')
      .then(res => res.json())
      .then(json => { if (!cancelled) setTariffs(json.data || []); })
      .catch(() => {});
      
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Slow polling
  useEffect(() => {
    const id = window.setInterval(() => { reload(); }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  // Action handlers ─────────────────────────────────────────────────────────

  async function handlePreview(code: string) {
    setBusyCode(code); setBannerError(null);
    try {
      const plan = await previewMove(code);
      setPlanByCode((prev) => ({ ...prev, [code]: plan }));
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Không tải được kế hoạch');
    } finally { setBusyCode(null); }
  }

  async function confirmMove(code: string, payload: MoveToDamagedYardPayload) {
    setBusyCode(code); setBannerError(null); setBannerSuccess(null);
    try {
      await moveToDamagedYard(code, payload);
      clearPendingOptimistic(code);
      setPlanByCode((prev) => { const n = { ...prev }; delete n[code]; return n; });
      setBannerSuccess(`Đã chuyển ${code} vào kho hỏng.`);
      setMoveTarget(null);
      reload();
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Chuyển kho hỏng thất bại');
    } finally { setBusyCode(null); }
  }

  const [cancelTargetCode, setCancelTargetCode] = useState<string | null>(null);

  async function confirmCancel() {
    if (!cancelTargetCode) return;
    setBusyCode(cancelTargetCode); setBannerError(null);
    try {
      await cancelDamage(cancelTargetCode);
      clearPendingOptimistic(cancelTargetCode);
      reload();
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Huỷ thất bại');
    } finally { 
      setBusyCode(null); 
      setCancelTargetCode(null);
    }
  }

  function handleCancel(code: string) {
    setCancelTargetCode(code);
  }

  async function openReturnPreview(report: DamageReport) {
    setBusyCode(report.containerCode); setBannerError(null);
    try {
      const preview = await previewReturnToYard(report.containerCode);
      setReturnTarget({ report, preview });
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Không lấy được vị trí đề xuất');
    } finally { setBusyCode(null); }
  }

  async function confirmReturn(containerId: string) {
    setBusyCode(containerId); setBannerError(null); setBannerSuccess(null);
    try {
      await returnToYard(containerId);
      setBannerSuccess(`Đã chuyển ${containerId} về kho gốc (slot do ML chọn).`);
      setReturnTarget(null);
      reload();
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : 'Chuyển về kho gốc thất bại');
    } finally { setBusyCode(null); }
  }

  // Derived filtering ───────────────────────────────────────────────────────

  const filtered = reports.filter((r) => {
    if (statusFilter === 'PENDING' && !(r.reportStatus === 'PENDING' || r.reportStatus === 'RELOCATING')) return false;
    if (statusFilter === 'STORED'  && r.reportStatus !== 'STORED') return false;
    const kw = keyword.trim().toLowerCase();
    if (!kw) return true;
    return r.containerCode.toLowerCase().includes(kw)
        || (r.cargoTypeName ?? '').toLowerCase().includes(kw);
  });

  const pendingCount = reports.filter((r) => r.reportStatus === 'PENDING' || r.reportStatus === 'RELOCATING').length;
  const storedCount  = reports.filter((r) => r.reportStatus === 'STORED').length;

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý kho hỏng</h1>
            <p>Tiếp nhận, theo dõi và xử lý container hỏng</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {pendingCount} đang xử lý · {storedCount} trong kho hỏng
          </span>
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã / loại hàng..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <select
            className="mgmt-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Đã báo hỏng / Đang đảo</option>
            <option value="STORED">Trong kho hỏng</option>
          </select>
          <button className="mgmt-apply-btn" onClick={reload}>Làm mới</button>
        </div>

        {bannerError && (
          <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', color: '#7f1d1d',
                        borderRadius: 6, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
            {bannerError}
          </div>
        )}
        {bannerSuccess && (
          <div style={{ padding: '0.5rem 0.75rem', background: '#d1fae5', color: '#065f46',
                        borderRadius: 6, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
            {bannerSuccess}
          </div>
        )}

        <div className="mgmt-content-row">
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Mã container</th>
                  <th>Loại hàng</th>
                  <th>Kích thước</th>
                  <th>Vị trí</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>TT sửa chữa</th>
                  <th>Ngày xuất</th>
                  <th>Tiền sửa</th>
                  <th>Tiền hoàn</th>
                  <th>Người báo</th>
                  <th>Ngày báo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="mgmt-state-row"><td colSpan={12}>Đang tải...</td></tr>
                )}
                {!loading && error && (
                  <tr className="mgmt-state-row mgmt-state-error"><td colSpan={12}>{error}</td></tr>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={12}>Chưa có container nào được báo hỏng</td>
                  </tr>
                )}
                {!loading && !error && filtered.map((r) => {
                  const plan = planByCode[r.containerCode];
                  const isPending = r.reportStatus === 'PENDING';
                  const isStored  = r.reportStatus === 'STORED';
                  const isBusy    = busyCode === r.containerCode;
                  const sl = statusLabel(r.reportStatus);
                  const location = r.currentZone
                    ? `${r.currentYard ?? '—'} · ${r.currentZone}${r.currentTier ? ` · T${r.currentTier}` : ''}${r.currentSlot ? ` · ${r.currentSlot}` : ''}`
                    : '—';
                  return (
                    <React.Fragment key={r.reportId}>
                    <tr>
                      <td><strong>{r.containerCode}</strong></td>
                      <td>{r.cargoTypeName || '—'}</td>
                      <td>
                        <span className="mgmt-badge mgmt-badge-neutral">{r.sizeType || '—'}</span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{location}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                        {r.reason || '—'}
                      </td>
                      <td><span className={sl.cls}>{sl.text}</span></td>
                      <td>
                        {r.repairStatus ? (
                          <span className={repairBadgeClass(r.repairStatus)}>{r.repairStatus}</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td>{formatDate(r.repairDate ?? '')}</td>
                      <td>{r.repairCost != null ? formatCurrency(String(r.repairCost)) : '—'}</td>
                      <td>
                        {r.compensationCost != null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>{formatCurrency(String(r.compensationCost))}</span>
                            {r.compensationRefunded && (
                              <span className="mgmt-badge mgmt-badge-success" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>
                                ✓ Đã hoàn ví
                              </span>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>{r.reportedBy || '—'}</td>
                      <td>{formatDate(r.reportedAt ?? '')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {isPending && (
                            <>
                              <button
                                title="Xem kế hoạch đảo"
                                onClick={() => handlePreview(r.containerCode)}
                                disabled={isBusy}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#6b7280', display: 'flex' }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                title="Chuyển vào kho hỏng"
                                onClick={() => setMoveTarget(r)}
                                disabled={isBusy || (plan != null && !plan.feasible)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#1e3a8a', display: 'flex' }}
                              >
                                <ArrowRight size={16} />
                              </button>
                              <button
                                title="Huỷ báo hỏng"
                                onClick={() => handleCancel(r.containerCode)}
                                disabled={isBusy}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#dc2626', display: 'flex' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {isStored && !isYardStaff && (
                            <>
                              <button
                                title="Cập nhật thông tin sửa chữa & bồi thường"
                                onClick={() => setEditingReport(r)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#1e3a8a', display: 'flex' }}
                              >
                                <FileEdit size={16} />
                              </button>
                              <button
                                title={
                                  r.repairStatus === 'REPAIRED'
                                    ? 'Xem vị trí đề xuất & chuyển về kho gốc (ML)'
                                    : 'Cần đánh dấu repair_status = REPAIRED trước'
                                }
                                disabled={isBusy || r.repairStatus !== 'REPAIRED'}
                                onClick={() => openReturnPreview(r)}
                                style={{
                                  background: 'none', border: 'none', cursor: r.repairStatus === 'REPAIRED' ? 'pointer' : 'not-allowed',
                                  padding: '0.2rem',
                                  color: r.repairStatus === 'REPAIRED' ? '#059669' : '#d1d5db',
                                  display: 'flex', alignItems: 'center', gap: '0.15rem',
                                }}
                              >
                                <Sparkles size={12} />
                                <ArrowLeft size={16} />
                              </button>
                            </>
                          )}
                          {r.reportStatus === 'RELOCATING' && (
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem', padding: '0.2rem' }}>Đang xử lý...</span>
                          )}
                          <button
                            title="Lịch sử trạng thái"
                            onClick={() => setSelectedHistory(r)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#6b7280', display: 'flex' }}
                          >
                            <Wrench size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {plan && (
                      <tr key={`${r.reportId}-plan`}>
                        <td colSpan={12} style={{ background: '#f9fafb', padding: '0.6rem 1rem' }}>
                          {plan.feasible ? (
                            <>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem', color: '#374151' }}>
                                Kế hoạch đảo ({plan.blockerCount} blocker{plan.blockerCount !== 1 ? 's' : ''}):
                              </div>
                              {plan.moves.map((m, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: '#4b5563', padding: '0.1rem 0' }}>
                                  {i + 1}. <b>{m.containerId}</b>: {m.fromZone} R{m.fromRow}-B{m.fromBay} T{m.fromTier}
                                  {' → '}{m.toZone} R{m.toRow}-B{m.toBay} T{m.toTier}
                                  {' '}<span style={{ color: '#9ca3af' }}>({m.purpose})</span>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div style={{ color: '#7f1d1d', fontSize: '0.82rem' }}>
                              ❌ {plan.infeasibilityReason ?? 'Không khả thi'}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedHistory && (
            <HistoryPanel
              containerCode={selectedHistory.containerCode}
              onClose={() => setSelectedHistory(null)}
            />
          )}
        </div>

        {editingReport && (
          <DamageDetailsModal
            report={editingReport}
            tariffs={tariffs}
            onClose={() => setEditingReport(null)}
            onSaved={() => { setEditingReport(null); reload(); }}
          />
        )}

        {moveTarget && (
          <MoveToDamagedYardModal
            report={moveTarget}
            busy={busyCode === moveTarget.containerCode}
            tariffs={tariffs}
            onClose={() => setMoveTarget(null)}
            onSubmit={(payload) => confirmMove(moveTarget.containerCode, payload)}
          />
        )}

        {returnTarget && (
          <ReturnPreviewModal
            report={returnTarget.report}
            preview={returnTarget.preview}
            busy={busyCode === returnTarget.report.containerCode}
            onClose={() => setReturnTarget(null)}
            onConfirm={() => confirmReturn(returnTarget.report.containerCode)}
          />
        )}
        
        {cancelTargetCode && (
          <div className="mgmt-modal-overlay" onClick={() => setCancelTargetCode(null)}>
            <div className="mgmt-modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className="mgmt-modal-header">
                <div className="mgmt-modal-title">
                  <AlertTriangle size={18} color="#ef4444" />
                  Xác nhận huỷ báo hỏng?
                </div>
                <button className="mgmt-modal-close" onClick={() => setCancelTargetCode(null)}>&times;</button>
              </div>
              <div style={{ padding: '0 1.25rem 1.25rem', fontSize: '0.85rem', color: '#4b5563' }}>
                Bạn có chắc chắn muốn huỷ báo hỏng cho container <strong>{cancelTargetCode}</strong> không? Hành động này không thể hoàn tác.
              </div>
              <div className="mgmt-modal-actions">
                <button 
                  onClick={() => setCancelTargetCode(null)}
                  disabled={busyCode === cancelTargetCode}
                  className="mgmt-action-btn mgmt-action-btn-secondary"
                >
                  Đóng
                </button>
                <button 
                  onClick={confirmCancel}
                  disabled={busyCode === cancelTargetCode}
                  className="mgmt-action-btn mgmt-action-btn-primary"
                  style={{ backgroundColor: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                >
                  {busyCode === cancelTargetCode ? 'Đang huỷ...' : 'Xác nhận huỷ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
