import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchGateInRecords } from '../services/gateInManagementService';
import type { GateInRecord } from '../services/gateInManagementService';
import { fetchStatusHistory } from '../services/containerService';
import type { StatusHistoryEntry } from '../services/containerService';
import './management.css';

const TYPE_OPTIONS = ['', '20ft', '40ft'];

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'IN_YARD')  return 'mgmt-badge mgmt-badge-neutral';
  if (s === 'GATE_IN')  return 'mgmt-badge mgmt-badge-neutral';
  if (s === 'GATE_OUT') return 'mgmt-badge mgmt-badge-warning';
  if (s === 'DAMAGED')  return 'mgmt-badge mgmt-badge-critical';
  return 'mgmt-badge mgmt-badge-neutral';
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
  const [records, setRecords] = useState<GateInRecord[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [pendingKeyword, setPendingKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pendingType, setPendingType] = useState('');

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  function applyFilter() {
    setKeyword(pendingKeyword);
    setTypeFilter(pendingType);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGateInRecords(page)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const filteredRecords = records
    .filter((r) => {
      // Only show containers that have been placed into a yard slot.
      if (r.status.toUpperCase() !== 'IN_YARD') return false;
      if (keyword.trim() && !r.containerCode.toLowerCase().includes(keyword.trim().toLowerCase())) {
        return false;
      }
      if (typeFilter && !r.containerType.toLowerCase().includes(typeFilter.toLowerCase())) {
        return false;
      }
      return true;
    })
    // Sort by gate-in time descending (newest first). gateInTime is "dd/MM/yyyy HH:mm"
    // so we parse it back to compare.
    .sort((a, b) => {
      const parse = (s: string): number => {
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
        if (!m) return 0;
        return new Date(
          Number(m[3]), Number(m[2]) - 1, Number(m[1]),
          Number(m[4]), Number(m[5]),
        ).getTime();
      };
      return parse(b.gateInTime) - parse(a.gateInTime);
    });

  const pageNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý Nhập Bãi</h1>
            <p>Danh sách lịch sử nhập container vào bãi</p>
          </div>
          {!loading && !error && (
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {filteredRecords.length} container đã nhập thành công
            </span>
          )}
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã container..."
              value={pendingKeyword}
              onChange={(e) => setPendingKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            />
          </div>
          <select
            className="mgmt-select"
            value={pendingType}
            onChange={(e) => setPendingType(e.target.value)}
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
                  <th>Người thực hiện</th>
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
                {!loading && !error && filteredRecords.length === 0 && (
                  <tr className="mgmt-state-row">
                    <td colSpan={11}>Chưa có bản ghi hạ bãi</td>
                  </tr>
                )}
                {!loading && !error && filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedCode(selectedCode === r.containerCode ? null : r.containerCode)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{r.containerCode || '—'}</strong></td>
                    <td>{r.cargoType || '—'}</td>
                    <td>
                      {r.containerType
                        ? <span className="mgmt-badge mgmt-badge-neutral">{r.containerType}</span>
                        : '—'}
                    </td>
                    <td>{r.grossWeight}</td>
                    <td>
                      {r.status
                        ? <span className={statusBadgeClass(r.status)}>{r.status}</span>
                        : '—'}
                    </td>
                    <td>{r.yardName || '—'}</td>
                    <td>{r.zoneName || '—'}</td>
                    <td>{r.blockName || '—'}</td>
                    <td>{r.slot}</td>
                    <td>{r.gateInTime}</td>
                    <td>{r.operator || '—'}</td>
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

          {selectedCode && (
            <HistoryPanel
              containerCode={selectedCode}
              onClose={() => setSelectedCode(null)}
            />
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
