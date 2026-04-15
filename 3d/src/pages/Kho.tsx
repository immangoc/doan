import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Pencil, ArrowRightLeft, CornerUpLeft } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchContainers, fetchStatusHistory } from '../services/containerService';
import { apiFetch } from '../services/apiClient';
import { getCachedYards } from '../services/yardService';
import { fetchAndSetOccupancy } from '../services/containerPositionService';
import { getOccupancyData, makeSlotKey } from '../store/occupancyStore';
import type { Container, StatusHistoryEntry, ContainerFilter } from '../services/containerService';
import './management.css';

type RestoreTarget = { slotId: number; tier: number };
type PopupType = 'success' | 'error' | 'info';

function PopupModal({ open, type, title, message, onClose }: {
  open: boolean;
  type: PopupType;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const palette =
    type === 'success'
      ? { bg: '#ECFDF5', border: '#86EFAC', fg: '#065F46', btn: '#10B981' }
      : type === 'error'
        ? { bg: '#FEF2F2', border: '#FCA5A5', fg: '#991B1B', btn: '#EF4444' }
        : { bg: '#EFF6FF', border: '#93C5FD', fg: '#1E40AF', btn: '#3B82F6' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', background: palette.bg, borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: palette.fg }}>{title}</div>
              <div style={{ fontSize: 12, color: palette.fg, opacity: 0.9, marginTop: 2 }}>{type.toUpperCase()}</div>
            </div>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: palette.fg, fontWeight: 900 }}
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ whiteSpace: 'pre-wrap', color: '#111827', fontSize: 13, lineHeight: 1.55, textAlign: 'center' }}>
            {message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                background: palette.btn,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const palette = danger
    ? { bg: '#FEF2F2', border: '#FCA5A5', fg: '#991B1B', btn: '#EF4444' }
    : { bg: '#EFF6FF', border: '#93C5FD', fg: '#1E40AF', btn: '#2563EB' };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', background: palette.bg, borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: palette.fg }}>{title}</div>
              <div style={{ fontSize: 12, color: palette.fg, opacity: 0.9, marginTop: 2 }}>CONFIRM</div>
            </div>
            <button
              onClick={onCancel}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: palette.fg, fontWeight: 900 }}
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ whiteSpace: 'pre-wrap', color: '#111827', fontSize: 13, lineHeight: 1.55, textAlign: 'center' }}>
            {message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                background: palette.btn,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RESTORE_MAP_KEY = 'damaged_restore_targets';

function readRestoreMap(): Record<string, RestoreTarget> {
  try {
    const raw = localStorage.getItem(RESTORE_MAP_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, RestoreTarget>;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeRestoreMap(map: Record<string, RestoreTarget>) {
  localStorage.setItem(RESTORE_MAP_KEY, JSON.stringify(map));
}

function getRelocatedSet() {
  try {
    const list = JSON.parse(localStorage.getItem('mock_relocated') || '[]');
    return new Set<string>(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

const TYPE_OPTIONS = ['', '20ft', '40ft'];

function statusBadgeClass(status: string): string {
  if (status === 'IN_YARD') return 'mgmt-badge mgmt-badge-in-yard';
  if (status === 'GATE_OUT') return 'mgmt-badge mgmt-badge-success';
  if (status === 'APPROVED') return 'mgmt-badge mgmt-badge-info';
  if (status === 'CANCELLED') return 'mgmt-badge mgmt-badge-critical';
  if (status === 'DAMAGED') return 'mgmt-badge mgmt-badge-critical text-red-600 bg-red-100';
  return 'mgmt-badge mgmt-badge-neutral';
}

// ─── Status history side panel ────────────────────────────────────────────────
function HistoryPanel({ containerId, containerCode, onClose }: {
  containerId: string;
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
    fetchStatusHistory(containerId)
      .then((h) => { if (!cancelled) setHistory(h); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải lịch sử'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [containerId]);

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

// ─── Main page ────────────────────────────────────────────────────────────────
export function Kho() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<ContainerFilter>({ statusName: 'DAMAGED' });
  const [pendingFilter, setPendingFilter] = useState<ContainerFilter>({ statusName: 'DAMAGED' });

  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [relocating, setRelocating] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [damageForm, setDamageForm] = useState({ repairStatus: '', repairDate: '', compensationCost: '' });
  const [savingDamage, setSavingDamage] = useState(false);
  const [popup, setPopup] = useState<{ type: PopupType; title: string; message: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    confirmText?: string;
    cancelText?: string;
    resolve?: (ok: boolean) => void;
  }>({ open: false, title: '', message: '' });

  function openPopup(type: PopupType, title: string, message: string) {
    setPopup({ type, title, message });
  }

  function isDamagedYardName(name?: string | null): boolean {
    const n = String(name ?? '').toLowerCase();
    return n.includes('hỏng') || n.includes('damaged');
  }

  function confirmAsync(opts: {
    title: string;
    message: string;
    danger?: boolean;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title: opts.title,
        message: opts.message,
        danger: opts.danger,
        confirmText: opts.confirmText,
        cancelText: opts.cancelText,
        resolve,
      });
    });
  }

  function openEditModal(e: React.MouseEvent, c: Container) {
    e.stopPropagation();
    setEditingContainer(c);
    setDamageForm({
      repairStatus: c.repairStatus || '',
      repairDate: c.repairDate ? c.repairDate.slice(0, 16) : '', // format cho datetime-local
      compensationCost: c.compensationCost?.toString() || ''
    });
  }

  async function handleUpdateDamage(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContainer) return;
    setSavingDamage(true);

    // containerId IS the container code string (e.g. "CONT0001")
    const id = editingContainer.containerId;
    let success = false;
    let fallbackError = '';

    try {
      const res = await apiFetch(`/admin/containers/${id}/damage-details`, {
        method: 'PUT',
        body: JSON.stringify({
          repairStatus: damageForm.repairStatus || null,
          repairDate: damageForm.repairDate || null,
          compensationCost: damageForm.compensationCost ? Number(damageForm.compensationCost) : null
        })
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        fallbackError = `HTTP ${res.status} ${errorText}`;
      } else {
        success = true;
      }
    } catch (err: any) {
      fallbackError = err.message;
    }

    // Fallback: update mock container in localStorage if backend fails
    if (!success) {
      const mockStr = localStorage.getItem('mock_damaged_containers');
      if (mockStr) {
        try {
          const mocks = JSON.parse(mockStr);
          const idx = mocks.findIndex((m: any) =>
            String(m.containerCode ?? m.containerId) === id
          );
          if (idx !== -1) {
            mocks[idx] = {
              ...mocks[idx],
              repairStatus: damageForm.repairStatus || null,
              repairDate: damageForm.repairDate || null,
              compensationCost: damageForm.compensationCost ? Number(damageForm.compensationCost) : null
            };
            localStorage.setItem('mock_damaged_containers', JSON.stringify(mocks));
            success = true;
          }
        } catch {}
      }

      if (!success) {
        openPopup('error', 'Cập nhật hư hỏng thất bại', `Lỗi: ${fallbackError}`);
      }
    }

    if (success) {
      openPopup('success', 'Thành công', 'Cập nhật thành công!');
      setEditingContainer(null);
      setFilter({ ...filter }); // trigger reload
    }

    setSavingDamage(false);
  }

  function applyFilter() {
    setFilter(pendingFilter);
    setPage(0);
  }

  async function handleRelocateToDamaged(e: React.MouseEvent, c: Container) {
    e.stopPropagation();
    const ok = await confirmAsync({
      title: 'Chuyển container sang kho hỏng',
      message: `Bạn có chắc muốn chuyển container ${c.containerCode} sang kho hỏng?`,
      danger: true,
      confirmText: 'Chuyển kho hỏng',
      cancelText: 'Hủy',
    });
    if (!ok) return;

    setRelocating(c.containerCode);
    try {
      // Snapshot current position before moving to damaged yard,
      // so we can propose restoring back to the previous slot after repair is completed.
      try {
        const posRes = await apiFetch(`/admin/containers/${c.containerId}/position`);
        const posJson = await posRes.json().catch(() => ({}));
        const pos = posJson?.data;
        if (pos && typeof pos.slotId === 'number' && typeof pos.tier === 'number') {
          const restoreMap = readRestoreMap();
          restoreMap[c.containerCode] = { slotId: pos.slotId, tier: pos.tier };
          writeRestoreMap(restoreMap);
        }
      } catch {
        // Best-effort only. If it fails, the "restore" button will be disabled later.
      }

      const yards = getCachedYards();
      const damagedYard = yards.find((y) => y.yardType.includes('hỏng') || y.yardType === 'damaged' || y.yardName.toLowerCase().includes('hỏng'));

      if (!damagedYard) {
        throw new Error('Chưa thiết lập kho hỏng trên hệ thống!');
      }

      const occupancy = getOccupancyData();
      let targetSlotId: number | null = null;

      // Tìm slot trống trong kho hỏng
      outer: for (const zone of damagedYard.zones) {
        for (const block of zone.blocks) {
          for (const slot of block.slots) {
            const row = slot.rowNo - 1;
            const col = slot.bayNo - 1;
            // Max tier kho hỏng thường là 1
            const key = makeSlotKey(damagedYard.yardType as any, zone.zoneName, row, col, 1);
            if (!occupancy.get(key)) {
              // Tìm thấy slot trống!
              targetSlotId = slot.slotId;
              break outer;
            }
          }
        }
      }

      if (!targetSlotId) {
        throw new Error('Kho hỏng đã đầy! Không còn slot trống.');
      }

      const res = await apiFetch('/admin/yard/relocate', {
        method: 'POST',
        body: JSON.stringify({
          containerId: c.containerId,
          targetSlotId: targetSlotId,
          targetTier: 1
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Lỗi backend: ${res.status} ${txt}`);
      }

      openPopup('success', 'Thành công', 'Chuyển kho hỏng thành công (cập nhật 2D/3D)!');
      // Cập nhật lại store 3D để nó render thật  
      await fetchAndSetOccupancy(yards);
      // Tải lại danh sách
      setFilter({ ...filter });

    } catch (err: any) {
      openPopup('error', 'Chuyển kho hỏng thất bại', `Lỗi chuyển kho: ${err.message}`);
    } finally {
      setRelocating(null);
    }
  }

  function isRepairCompleted(repairStatus?: string | null): boolean {
    const s = (repairStatus ?? '').trim().toLowerCase();
    return s === 'đã hoàn thành' || s === 'hoàn thành' || s === 'completed' || s === 'done';
  }

  async function handleProposeRestore(e: React.MouseEvent, c: Container) {
    e.stopPropagation();
    if (!isRepairCompleted(c.repairStatus)) return;

    const restoreMap = readRestoreMap();
    let target: RestoreTarget | null = restoreMap[c.containerCode] ?? null;

    // Fallback: if we don't have an exact previous slot snapshot, try to infer the "old yard"
    // from storage history and pick the first empty slot in that yard.
    if (!target) {
      try {
        const histRes = await apiFetch(`/admin/containers/${c.containerId}/storage`);
        const histJson = await histRes.json().catch(() => ({}));
        const items = (histJson?.data ?? []) as Array<{
          yardId?: number;
          yardName?: string;
          storageStartDate?: string;
          storageEndDate?: string | null;
        }>;

        // Pick the most recent non-damaged yard (by storageStartDate/EndDate ordering as best-effort).
        const sorted = [...items].sort((a, b) => {
          const ta = Date.parse(String(a.storageEndDate ?? a.storageStartDate ?? '')) || 0;
          const tb = Date.parse(String(b.storageEndDate ?? b.storageStartDate ?? '')) || 0;
          return tb - ta;
        });

        const lastNonDamaged = sorted.find((x) => {
          const name = String(x.yardName ?? '').toLowerCase();
          return name && !name.includes('hỏng') && !name.includes('damaged');
        });

        const yardId = lastNonDamaged?.yardId;
        if (!yardId) {
          throw new Error('Không xác định được kho cũ từ lịch sử lưu kho.');
        }

        const yards = getCachedYards();
        const oldYard = yards.find((y) => y.yardId === yardId);
        if (!oldYard) {
          throw new Error('Chưa tải dữ liệu kho bãi (yards cache rỗng). Hãy bấm "Làm mới" ở 2D/3D rồi thử lại.');
        }

        const occupancy = getOccupancyData();
        let found: RestoreTarget | null = null;

        outerOld: for (const zone of oldYard.zones) {
          for (const block of zone.blocks) {
            for (const slot of block.slots) {
              const row = slot.rowNo - 1;
              const col = slot.bayNo - 1;
              const tier = 1;
              const key = makeSlotKey(oldYard.yardType as any, zone.zoneName, row, col, tier);
              if (!occupancy.get(key)) {
                found = { slotId: slot.slotId, tier };
                break outerOld;
              }
            }
          }
        }

        if (!found) throw new Error('Kho cũ đã đầy hoặc chưa có occupancy để chọn slot trống.');
        target = found;
      } catch (err: any) {
        openPopup('error', 'Về kho cũ thất bại', err?.message || 'Không tìm được vị trí để về kho cũ.');
        return;
      }
    }

    const ok = await confirmAsync({
      title: 'Về vị trí cũ',
      message: `Đề nghị di chuyển container ${c.containerCode} về vị trí cũ (slotId=${target.slotId}, tier=${target.tier})?`,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
    });
    if (!ok) return;

    setRestoring(c.containerCode);
    try {
      // No-op guard: if container is already at target slot/tier, treat as success
      try {
        const curRes = await apiFetch(`/admin/containers/${c.containerId}/position`);
        const curJson = await curRes.json().catch(() => ({}));
        const cur = curJson?.data ?? curJson;
        const curSlotId = cur?.slotId != null ? Number(cur.slotId) : null;
        const curTier = cur?.tier != null ? Number(cur.tier) : null;
        if (curSlotId === target.slotId && curTier === target.tier) {
          openPopup('info', 'Không cần di chuyển', 'Container đã ở đúng vị trí cũ (slot/tier) nên không cần relocate.');

          // Remove from "Kho hỏng" management UI immediately
          setContainers((prev) => prev.filter((x) => x.containerId !== c.containerId));
          setTotalItems((n) => Math.max(0, n - 1));
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.add(c.containerId);
            return next;
          });
          if (selectedContainer?.containerId === c.containerId) setSelectedContainer(null);
          if (editingContainer?.containerId === c.containerId) setEditingContainer(null);
          return;
        }
      } catch {
        // Ignore and proceed with relocate call
      }

      const res = await apiFetch('/admin/yard/relocate', {
        method: 'POST',
        body: JSON.stringify({
          containerId: c.containerId,
          targetSlotId: target.slotId,
          targetTier: target.tier
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        // Backend no-op guard: "already at the specified slot and tier" → treat as success
        if (res.status === 400 && txt.includes('already at the specified slot and tier')) {
          openPopup('info', 'Không cần di chuyển', 'Container đã ở đúng vị trí cũ (slot/tier) nên không cần relocate.');

          // Remove from "Kho hỏng" management UI immediately
          setContainers((prev) => prev.filter((x) => x.containerId !== c.containerId));
          setTotalItems((n) => Math.max(0, n - 1));
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.add(c.containerId);
            return next;
          });
          if (selectedContainer?.containerId === c.containerId) setSelectedContainer(null);
          if (editingContainer?.containerId === c.containerId) setEditingContainer(null);
          return;
        }
        throw new Error(`Lỗi backend: ${res.status} ${txt}`);
      }

      openPopup('success', 'Thành công', 'Đã gửi đề nghị/di chuyển về vị trí cũ thành công!');
      const yards = getCachedYards();
      await fetchAndSetOccupancy(yards);

      // Remove from "Kho hỏng" management UI immediately (even if backend status update is async/not implemented).
      setContainers((prev) => prev.filter((x) => x.containerId !== c.containerId));
      setTotalItems((n) => Math.max(0, n - 1));
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(c.containerId);
        return next;
      });
      if (selectedContainer?.containerId === c.containerId) setSelectedContainer(null);
      if (editingContainer?.containerId === c.containerId) setEditingContainer(null);
    } catch (err: any) {
      openPopup('error', 'Về kho cũ thất bại', `Lỗi: ${err.message || 'Không thể di chuyển'}`);
    } finally {
      setRestoring(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchContainers(filter, page)
      .then((result) => {
        if (cancelled) return;
        // Show all DAMAGED containers in management list (reported damaged),
        // even if they haven't been physically relocated to the damaged yard yet.
        setContainers(result.content);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalElements);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page]);

  // Refresh list when 3D "báo hỏng" fires
  useEffect(() => {
    const handler = () => setFilter((f) => ({ ...f }));
    window.addEventListener('wms:damaged-refresh', handler as EventListener);
    return () => window.removeEventListener('wms:damaged-refresh', handler as EventListener);
  }, []);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="mgmt-page">
        <PopupModal
          open={!!popup}
          type={popup?.type ?? 'info'}
          title={popup?.title ?? ''}
          message={popup?.message ?? ''}
          onClose={() => setPopup(null)}
        />
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          onCancel={() => {
            confirmState.resolve?.(false);
            setConfirmState({ open: false, title: '', message: '' });
          }}
          onConfirm={() => {
            confirmState.resolve?.(true);
            setConfirmState({ open: false, title: '', message: '' });
          }}
        />
        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý Kho Hỏng</h1>
            <p>Quản lý danh sách container bị hỏng hoặc báo sự cố</p>
          </div>
          {!loading && !error && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{totalItems} container</span>
          )}
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã container..."
              value={pendingFilter.keyword ?? ''}
              onChange={(e) => setPendingFilter((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            />
          </div>
          <select
            className="mgmt-select"
            value={pendingFilter.containerType ?? ''}
            onChange={(e) => setPendingFilter((f) => ({ ...f, containerType: e.target.value }))}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t || 'Tất cả loại'}</option>
            ))}
          </select>
          <button className="mgmt-apply-btn" onClick={applyFilter}>Tìm kiếm</button>
        </div>

        <div className="mgmt-content-row">
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Mã container</th>
                  <th>Loại hàng</th>
                  <th>Kích thước</th>
                  <th>Trạng thái</th>
                  <th>Vị trí (Kho/Zone/Slot)</th>
                  <th>Trạng thái sửa</th>
                  <th>Ngày sửa</th>
                  <th>Tiền đền</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="mgmt-state-row">
                    <td colSpan={9}>Đang tải dữ liệu...</td>
                  </tr>
                )}
                {!loading && error && (
                  <tr className="mgmt-state-row mgmt-state-error">
                    <td colSpan={9}>{error}</td>
                  </tr>
                )}
                {!loading && !error && containers.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={9}>Không tìm thấy container</td>
                  </tr>
                )}
                {!loading && !error && containers.filter((c) => !hiddenIds.has(c.containerId)).map((c) => (
                  <tr
                    key={c.containerId}
                    onClick={() => setSelectedContainer(
                      selectedContainer?.containerId === c.containerId ? null : c
                    )}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{c.containerCode}</strong></td>
                    <td>{c.cargoType || '—'}</td>
                    <td>
                      <span className="mgmt-badge mgmt-badge-neutral">{c.containerType || '—'}</span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(c.status)}>{c.status || '—'}</span>
                    </td>
                    <td>{c.yardName} / {c.zoneName} / {c.slot}</td>
                    <td>{c.repairStatus || '—'}</td>
                    <td>{c.repairDate ? new Date(c.repairDate).toLocaleString('vi-VN') : '—'}</td>
                    <td>{c.compensationCost ? `${c.compensationCost.toLocaleString()} đ` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mgmt-action-group">
                        <button
                          className="mgmt-action-btn mgmt-action-btn-primary"
                          onClick={(e) => openEditModal(e, c)}
                          title="Cập nhật trạng thái sửa chữa"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>
                        <button
                          className="mgmt-action-btn mgmt-action-btn-danger"
                          onClick={(e) => handleRelocateToDamaged(e, c)}
                          disabled={relocating === c.containerCode || isDamagedYardName(c.yardName)}
                          title="Chuyển container sang kho hỏng"
                        >
                          <ArrowRightLeft size={14} />
                          {isDamagedYardName(c.yardName) ? 'Đã ở kho hỏng' : relocating === c.containerCode ? 'Đang chuyển...' : 'Chuyển kho hỏng'}
                        </button>
                        <button
                          className="mgmt-action-btn mgmt-action-btn-success"
                          title={
                            isRepairCompleted(c.repairStatus)
                              ? 'Di chuyển container về vị trí cũ'
                              : 'Chỉ khả dụng khi trạng thái sửa là "Đã hoàn thành"'
                          }
                          onClick={(e) => handleProposeRestore(e, c)}
                          disabled={restoring === c.containerCode || !isRepairCompleted(c.repairStatus)}
                        >
                          <CornerUpLeft size={14} />
                          {restoring === c.containerCode ? 'Đang gửi...' : 'Về kho cũ'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && !error && totalPages > 1 && (
              <div className="mgmt-pagination">
                <span>Trang {page + 1} / {totalPages}</span>
                <div className="mgmt-pagination-btns">
                  <button
                    className="mgmt-page-btn"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageNums.slice(
                    Math.max(0, page - 2),
                    Math.min(totalPages, page + 3),
                  ).map((n) => (
                    <button
                      key={n}
                      className={`mgmt-page-btn ${n === page ? 'mgmt-page-btn-active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n + 1}
                    </button>
                  ))}
                  <button
                    className="mgmt-page-btn"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedContainer && (
            <HistoryPanel
              containerId={selectedContainer.containerId}
              containerCode={selectedContainer.containerCode}
              onClose={() => setSelectedContainer(null)}
            />
          )}
        </div>

      </div>

      {editingContainer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Cập nhật hư hỏng: {editingContainer.containerCode}</h3>
            <form onSubmit={handleUpdateDamage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Trạng thái sửa chữa</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  value={damageForm.repairStatus}
                  onChange={e => setDamageForm({ ...damageForm, repairStatus: e.target.value })}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Đang kiểm tra">Đang kiểm tra</option>
                  <option value="Đang lấy báo giá">Đang lấy báo giá</option>
                  <option value="Đang sửa chữa">Đang sửa chữa</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Ngày sửa (hoặc Ngày dự kiến)</label>
                <input
                  type="datetime-local"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  value={damageForm.repairDate}
                  onChange={e => setDamageForm({ ...damageForm, repairDate: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Tiền đền bù (VNĐ)</label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  value={damageForm.compensationCost}
                  onChange={e => setDamageForm({ ...damageForm, compensationCost: e.target.value })}
                  placeholder="Ví dụ: 5000000"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setEditingContainer(null)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={savingDamage} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer' }}>
                  {savingDamage ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
