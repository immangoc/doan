import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchContainers, fetchStatusHistory } from '../services/containerService';
import type { Container, StatusHistoryEntry, ContainerFilter } from '../services/containerService';
import './management.css';

const TYPE_OPTIONS = ['', '20ft', '40ft'];

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'GATE_OUT')  return 'mgmt-badge mgmt-badge-warning';
  if (s === 'EXPORTED')  return 'mgmt-badge mgmt-badge-neutral';
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
export function XuatBai() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<ContainerFilter>({ statusName: 'GATE_OUT' });
  const [pendingFilter, setPendingFilter] = useState<ContainerFilter>({ statusName: 'GATE_OUT' });

  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

  function applyFilter() {
    setFilter((prev) => ({ ...prev, ...pendingFilter, statusName: 'GATE_OUT' }));
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchContainers(filter, page)
      .then((result) => {
        if (cancelled) return;
        // Sort by gate-out time descending (newest first).
        // Containers without a gate-out time are pushed to the bottom.
        const sorted = [...result.content].sort((a, b) => {
          const ta = a.gateOutTime ? new Date(a.gateOutTime).getTime() : 0;
          const tb = b.gateOutTime ? new Date(b.gateOutTime).getTime() : 0;
          return tb - ta;
        });
        setContainers(sorted);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalElements);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page]);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý Xuất Bãi</h1>
            <p>Lịch sử container đã xuất khỏi bãi</p>
          </div>
          {!loading && !error && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{totalItems} container đã xuất</span>
          )}
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã container đã xuất..."
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
                  <th>Trọng lượng</th>
                  <th>Trạng thái</th>
                  <th>Kho</th>
                  <th>Zone</th>
                  <th>Block</th>
                  <th>Vị trí</th>
                  <th>Ngày nhập hệ thống</th>
                  <th>Ngày xuất</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="mgmt-state-row">
                    <td colSpan={11}>Đang tải dữ liệu...</td>
                  </tr>
                )}
                {!loading && error && (
                  <tr className="mgmt-state-row mgmt-state-error">
                    <td colSpan={11}>{error}</td>
                  </tr>
                )}
                {!loading && !error && containers.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={11}>Không có container nào đã xuất</td>
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
                    <td>{c.yardName || '—'}</td>
                    <td>{c.zoneName || '—'}</td>
                    <td>{c.blockName || '—'}</td>
                    <td>{c.slot || '—'}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>{formatDate(c.gateOutTime)}</td>
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
