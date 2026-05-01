import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchContainers, fetchStatusHistory } from '../services/containerService';
import type { Container, StatusHistoryEntry, ContainerFilter } from '../services/containerService';
import { apiFetch } from '../services/apiClient';
import './management.css';

const TYPE_OPTIONS = ['', '20ft', '40ft'];
const CARGO_OPTIONS = ['', 'Thường', 'Đông lạnh', 'Nguy hiểm', 'Quá khổ'];
const STATUS_OPTIONS = ['', 'IN_YARD', 'STORED', 'GATE_IN'];

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'IN_YARD' || s === 'STORED') return 'mgmt-badge mgmt-badge-neutral';
  if (s === 'GATE_IN') return 'mgmt-badge mgmt-badge-neutral';
  if (s === 'GATE_OUT') return 'mgmt-badge mgmt-badge-warning';
  if (s === 'DAMAGED') return 'mgmt-badge mgmt-badge-critical';
  return 'mgmt-badge mgmt-badge-neutral';
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

interface PlacementTask {
  taskId: number;
  containerId: string;
  slotName: string;
  tier: number;
  status: string;
  yardName: string;
  zoneName: string;
  blockName: string;
  cargoType: string;
  containerType: string;
  grossWeight: number;
  createdAt: string;
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

// ─── Main page ────────────────────────────────────────────────────────────────
export function HaBai() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [tasks, setTasks] = useState<PlacementTask[]>([]);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTasksModal, setShowTasksModal] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState<number | null>(null);

  // Default filter to IN_YARD containers
  const [filter, setFilter] = useState<ContainerFilter>({ statusName: 'IN_YARD' });
  const [pendingFilter, setPendingFilter] = useState<ContainerFilter>({ statusName: 'IN_YARD' });

  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

  function applyFilter() {
    setFilter((prev) => ({ ...prev, ...pendingFilter, statusName: 'IN_YARD' }));
    setPage(0);
  }

  function loadTasks() {
    setTaskLoading(true);
    setTaskError(null);
    apiFetch('/admin/placement-tasks/pending')
      .then(r => r.json())
      .then(json => {
        setTasks(json.data || []);
      })
      .catch(e => setTaskError(e instanceof Error ? e.message : 'Lỗi tải lệnh xếp chỗ'))
      .finally(() => setTaskLoading(false));
  }

  function loadContainers() {
    setLoading(true);
    setError(null);
    fetchContainers(filter, page)
      .then((result) => {
        // Sort by newest first
        const sorted = [...result.content].sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setContainers(sorted);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalElements);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    loadContainers();
  }, [filter, page]);

  async function confirmTask(taskId: number) {
    setConfirmingTaskId(taskId);
    try {
      const res = await apiFetch(`/admin/placement-tasks/${taskId}/confirm`, { method: 'POST' });
      if (!res.ok) throw new Error('Xác nhận thất bại');
      loadTasks();
      loadContainers();
      if (tasks.length === 1) setShowTasksModal(false); // close if it was the last task
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi xác nhận');
    } finally {
      setConfirmingTaskId(null);
    }
  }

  const pageNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý Nhập Bãi</h1>
            <p>Xác nhận lệnh xếp chỗ & danh sách container đang lưu kho</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => {
                loadTasks();
                setShowTasksModal(true);
              }}
              style={{
                padding: '8px 16px', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                background: tasks.length > 0 ? '#3b82f6' : '#6b7280',
                color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              Lệnh chờ xếp chỗ ({tasks.length})
            </button>
          </div>
        </div>

        {/* Tasks Modal */}
        {showTasksModal && (
          <div className="ks-modal-overlay" onClick={() => setShowTasksModal(false)} style={{ zIndex: 1000, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ks-modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '1000px', background: '#fff', borderRadius: 8, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>Lệnh chờ xếp chỗ ({tasks.length})</h3>
                <button onClick={() => setShowTasksModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div className="mgmt-table-wrap">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Mã container</th>
                      <th>Loại hàng</th>
                      <th>Kích thước</th>
                      <th>Kho đích</th>
                      <th>Zone</th>
                      <th>Vị trí đích</th>
                      <th>Thời gian đẩy lệnh</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskLoading && (
                      <tr className="mgmt-state-row"><td colSpan={8}>Đang tải lệnh...</td></tr>
                    )}
                    {!taskLoading && taskError && (
                      <tr className="mgmt-state-row mgmt-state-error"><td colSpan={8}>{taskError}</td></tr>
                    )}
                    {!taskLoading && !taskError && tasks.length === 0 && (
                      <tr className="mgmt-state-row"><td colSpan={8}>Hiện không có lệnh chờ xếp chỗ.</td></tr>
                    )}
                    {!taskLoading && !taskError && tasks.map(t => (
                      <tr key={t.taskId}>
                        <td><strong>{t.containerId}</strong></td>
                        <td>{t.cargoType || '—'}</td>
                        <td><span className="mgmt-badge mgmt-badge-neutral">{t.containerType || '—'}</span></td>
                        <td>{t.yardName}</td>
                        <td>{t.zoneName} - {t.blockName}</td>
                        <td><strong style={{ color: '#047857' }}>{t.slotName} · Tầng {t.tier}</strong></td>
                        <td>{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                        <td>
                          <button
                            onClick={() => confirmTask(t.taskId)}
                            disabled={confirmingTaskId === t.taskId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, background: '#10b981', color: '#fff',
                              border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer',
                              opacity: confirmingTaskId === t.taskId ? 0.7 : 1
                            }}
                          >
                            <CheckCircle size={14} />
                            {confirmingTaskId === t.taskId ? 'Đang xác nhận...' : 'Xác nhận hạ bãi'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm kiếm mã, loại, kho, trọng lượng..."
              value={pendingFilter.keyword ?? ''}
              onChange={(e) => setPendingFilter((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              style={{ width: '100%' }}
            />
          </div>
          <button className="mgmt-apply-btn" onClick={applyFilter}>Tìm</button>
        </div>

        <div className="mgmt-content-row">
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Mã container</th>
                  <th>Loại hàng</th>
                  <th>Kích thước</th>
                  <th>Trọng lượng</th>
                  <th>Trạng thái</th>
                  <th>Kho</th>
                  <th>Zone</th>
                  <th>Block</th>
                  <th>Vị trí</th>
                  <th>Ngày nhập hệ thống</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="mgmt-state-row">
                    <td colSpan={10}>Đang tải dữ liệu...</td>
                  </tr>
                )}
                {!loading && error && (
                  <tr className="mgmt-state-row mgmt-state-error">
                    <td colSpan={10}>{error}</td>
                  </tr>
                )}
                {!loading && !error && containers.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={10}>Không có container nào đang lưu kho</td>
                  </tr>
                )}
                {!loading && !error && containers.map((c) => (
                  <tr
                    key={c.containerId}
                    onClick={() => setSelectedContainer(selectedContainer?.containerCode === c.containerCode ? null : c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{c.containerCode || '—'}</strong></td>
                    <td>{c.cargoType || '—'}</td>
                    <td>
                      {c.containerType
                        ? <span className="mgmt-badge mgmt-badge-neutral">{c.containerType}</span>
                        : '—'}
                    </td>
                    <td>{c.grossWeight}</td>
                    <td>
                      {c.status
                        ? <span className={statusBadgeClass(c.status)}>{c.status}</span>
                        : '—'}
                    </td>
                    <td>{c.yardName || '—'}</td>
                    <td>{c.zoneName || '—'}</td>
                    <td>{c.blockName || '—'}</td>
                    <td>{c.slot}</td>
                    <td>{formatDate(c.createdAt)}</td>
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
              containerCode={selectedContainer.containerCode}
              onClose={() => setSelectedContainer(null)}
            />
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
