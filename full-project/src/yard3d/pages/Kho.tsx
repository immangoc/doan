import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Wrench, FileEdit, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchContainers, fetchStatusHistory, updateDamageDetails, markRepaired } from '../services/containerService';
import type { Container, StatusHistoryEntry, ContainerFilter, DamageDetailsPayload } from '../services/containerService';
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
function DamageDetailsModal({ container, onClose, onSaved }: {
  container: Container;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [repairStatus, setRepairStatus] = useState(container.repairStatus || '');
  const [repairDate, setRepairDate] = useState(() => {
    if (!container.repairDate) return '';
    const d = new Date(container.repairDate);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  });
  const [compensationCost, setCompensationCost] = useState(
    container.compensationCost && Number(container.compensationCost) > 0
      ? String(Number(container.compensationCost))
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: DamageDetailsPayload = {};
      if (repairStatus) payload.repairStatus = repairStatus;
      if (repairDate) payload.repairDate = new Date(repairDate).toISOString();
      if (compensationCost) payload.compensationCost = Number(compensationCost);
      await updateDamageDetails(container.containerCode, payload);
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
            Cập nhật thông tin hỏng — {container.containerCode}
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
              Ngày sửa chữa
            </label>
            <input
              type="datetime-local"
              className="mgmt-select"
              style={{ width: '100%' }}
              value={repairDate}
              onChange={(e) => setRepairDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Chi phí bồi thường (VND)
            </label>
            <input
              type="number"
              className="mgmt-select"
              style={{ width: '100%' }}
              placeholder="Nhập số tiền..."
              value={compensationCost}
              onChange={(e) => setCompensationCost(e.target.value)}
              min={0}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export function Kho() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState<ContainerFilter>({ statusName: 'DAMAGED' });
  const [pendingFilter, setPendingFilter] = useState<ContainerFilter>({ statusName: 'DAMAGED' });

  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [repairingId, setRepairingId] = useState<string | null>(null);

  function applyFilter() {
    setFilter((prev) => ({ ...prev, ...pendingFilter, statusName: 'DAMAGED' }));
    setPage(0);
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  async function handleMarkRepaired(containerId: string) {
    if (!confirm('Xác nhận đánh dấu container đã sửa xong? Container sẽ chuyển về trạng thái AVAILABLE.')) return;
    setRepairingId(containerId);
    try {
      await markRepaired(containerId);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setRepairingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchContainers(filter, page)
      .then((result) => {
        if (cancelled) return;
        setContainers(result.content);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalElements);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page, reloadKey]);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý kho hỏng</h1>
            <p>Tiếp nhận, theo dõi và xử lý container trong kho hỏng</p>
          </div>
          {!loading && !error && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{totalItems} mục trong kho hỏng</span>
          )}
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã container hỏng..."
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
                  <th>Mã container hỏng</th>
                  <th>Loại hàng</th>
                  <th>Kích thước</th>
                  <th>Trọng lượng</th>
                  <th>Trạng thái</th>
                  <th>TT sửa chữa</th>
                  <th>Ngày sửa</th>
                  <th>Chi phí bồi thường</th>
                  <th>Kho hỏng</th>
                  <th>Zone</th>
                  <th>Vị trí</th>
                  <th>Ngày nhập</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="mgmt-state-row">
                    <td colSpan={13}>Đang tải dữ liệu...</td>
                  </tr>
                )}
                {!loading && error && (
                  <tr className="mgmt-state-row mgmt-state-error">
                    <td colSpan={13}>{error}</td>
                  </tr>
                )}
                {!loading && !error && containers.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={13}>Không tìm thấy container damaged</td>
                  </tr>
                )}
                {!loading && !error && containers.map((c) => (
                  <tr
                    key={c.containerId}
                    onClick={() => setSelectedContainer(
                      selectedContainer?.containerCode === c.containerCode ? null : c
                    )}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{c.containerCode}</strong></td>
                    <td>{c.cargoType || '—'}</td>
                    <td>
                      <span className="mgmt-badge mgmt-badge-neutral">{c.containerType || '—'}</span>
                    </td>
                    <td>{c.grossWeight}</td>
                    <td>
                      <span className={statusBadgeClass(c.status)}>{c.status || '—'}</span>
                    </td>
                    <td>
                      {c.repairStatus ? (
                        <span className={repairBadgeClass(c.repairStatus)}>{c.repairStatus}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Chưa cập nhật</span>
                      )}
                    </td>
                    <td>{formatDate(c.repairDate)}</td>
                    <td>{formatCurrency(c.compensationCost)}</td>
                    <td>{c.yardName || 'Kho hỏng'}</td>
                    <td>{c.zoneName || '—'}</td>
                    <td>{c.slot || '—'}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Cập nhật thông tin hỏng"
                          onClick={() => setEditingContainer(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#1e3a8a', display: 'flex' }}
                        >
                          <FileEdit size={16} />
                        </button>
                        <button
                          title="Đánh dấu đã sửa xong"
                          disabled={repairingId === c.containerCode}
                          onClick={() => handleMarkRepaired(c.containerCode)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#059669', display: 'flex' }}
                        >
                          <CheckCircle size={16} />
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
              containerCode={selectedContainer.containerCode}
              onClose={() => setSelectedContainer(null)}
            />
          )}
        </div>

        {editingContainer && (
          <DamageDetailsModal
            container={editingContainer}
            onClose={() => setEditingContainer(null)}
            onSaved={() => {
              setEditingContainer(null);
              reload();
            }}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
