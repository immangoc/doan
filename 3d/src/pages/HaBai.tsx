import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchGateInRecords } from '../services/gateInManagementService';
import type { GateInRecord } from '../services/gateInManagementService';
import './management.css';

export function HaBai() {
  const [records, setRecords] = useState<GateInRecord[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGateInRecords(page)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.content);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalElements);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

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
              {totalItems} bản ghi
            </span>
          )}
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mã container</th>
                <th>Loại hàng</th>
                <th>Block / Vị trí</th>
                <th>Thời gian hạ bãi</th>
                <th>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className="mgmt-state-row">
                  <td colSpan={6}>Đang tải dữ liệu...</td>
                </tr>
              )}
              {!loading && error && (
                <tr className="mgmt-state-row mgmt-state-error">
                  <td colSpan={6}>{error}</td>
                </tr>
              )}
              {!loading && !error && records.length === 0 && (
                <tr className="mgmt-state-row">
                  <td colSpan={6}>Chưa có bản ghi hạ bãi</td>
                </tr>
              )}
              {!loading && !error && records.map((r, idx) => (
                <tr key={r.id}>
                  <td style={{ color: '#9ca3af' }}>{page * 20 + idx + 1}</td>
                  <td><strong>{r.containerCode}</strong></td>
                  <td>{r.cargoType || '—'}</td>
                  <td>
                    {r.blockName !== '—'
                      ? `${r.blockName} / R${r.rowNo} B${r.bayNo} T${r.tier}`
                      : '—'
                    }
                  </td>
                  <td>{r.gateInTime}</td>
                  <td>{r.operator}</td>
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

      </div>
    </DashboardLayout>
  );
}
