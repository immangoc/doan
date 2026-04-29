import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type OrderItem = {
  orderId: number;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  statusName: string;
  note?: string;
  createdAt?: string;
  importDate?: string;
  exportDate?: string;
  totalGrossWeight?: number;
  containerIds?: string[];
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:          'badge-warning',
  APPROVED:         'badge-info',
  WAITING_CHECKIN:  'badge-info',
  LATE_CHECKIN:     'badge-danger',
  READY_FOR_IMPORT: 'badge-info',
  IMPORTED:         'badge-success',
  STORED:           'badge-success',
  EXPORTED:         'badge-success',
  REJECTED:         'badge-danger',
  CANCELLED:        'badge-danger',
  CANCEL_REQUESTED: 'badge-warning',
  ACTIVE:           'badge-success',
  COMPLETED:        'badge-success',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:          'Chờ duyệt',
  APPROVED:         'Đã duyệt',
  WAITING_CHECKIN:  'Chờ nhập kho',
  LATE_CHECKIN:     'Trễ check-in',
  READY_FOR_IMPORT: 'Chờ nhập kho',
  IMPORTED:         'Đã nhập kho',
  STORED:           'Đang lưu kho',
  EXPORTED:         'Đã xuất kho',
  REJECTED:         'Từ chối',
  CANCELLED:        'Đã hủy',
  CANCEL_REQUESTED: 'Yêu cầu hủy',
  ACTIVE:           'Hoạt động',
  COMPLETED:        'Hoàn tất',
};

const CHECKIN_TRANSITIONS = ['WAITING_CHECKIN', 'LATE_CHECKIN'] as const;

export default function DonHang() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchOrders = async (pg = 0, kw = search, st = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), size: '20' });
      if (kw) params.set('keyword', kw);
      if (st) params.set('statusName', st);
      const res = await fetch(`${API_BASE}/admin/orders?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải đơn hàng');
      const pageData = data.data;
      setOrders(pageData.content || []);
      setTotal(pageData.totalElements ?? 0);
      setTotalPages(pageData.totalPages ?? 0);
      setPage(pg);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(0, '', ''); }, []);

  const handleSearch = () => fetchOrders(0, search, statusFilter);

  const handleView = async (orderId: number) => {
    setDetailLoading(true);
    setDetailOrder(null);
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải chi tiết');
      setDetailOrder(data.data);
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
      setDetailOrder({ orderId } as OrderItem);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/approve`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi duyệt đơn');
      setActionMsg('Đã duyệt đơn hàng.');
      fetchOrders(page);
      setDetailOrder(null);
      window.dispatchEvent(new CustomEvent('wms:notification-refresh'));
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
    }
  };

  const handleReject = async (orderId: number) => {
    if (!window.confirm('Xác nhận từ chối đơn hàng này?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/reject`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi từ chối đơn');
      setActionMsg('Đã từ chối đơn hàng.');
      fetchOrders(page);
      setDetailOrder(null);
      window.dispatchEvent(new CustomEvent('wms:notification-refresh'));
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
    }
  };

  const handleApproveCancellation = async (orderId: number) => {
    if (!window.confirm('Xác nhận chấp nhận yêu cầu hủy đơn hàng này?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/approve-cancel`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi chấp nhận hủy');
      setActionMsg('Đã chấp nhận yêu cầu hủy.');
      fetchOrders(page);
      setDetailOrder(null);
      window.dispatchEvent(new CustomEvent('wms:notification-refresh'));
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
    }
  };

  const handleChangeStatus = async (orderId: number, statusName: string) => {
    if (!window.confirm(`Chuyển đơn sang trạng thái "${STATUS_LABEL[statusName] || statusName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PUT', headers,
        body: JSON.stringify({ statusName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
      setActionMsg(`Đã chuyển trạng thái sang ${STATUS_LABEL[statusName] || statusName}.`);
      fetchOrders(page);
      // Reload detail to reflect new status
      setDetailOrder((prev) => prev ? { ...prev, statusName } : prev);
      window.dispatchEvent(new CustomEvent('wms:notification-refresh'));
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
    }
  };

  const handleAdminCancel = async (orderId: number) => {
    const reason = window.prompt('Lý do hủy (tùy chọn):') ?? '';
    if (reason === null) return; // user pressed Cancel on prompt
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hủy đơn');
      setActionMsg('Đã hủy đơn hàng.');
      fetchOrders(page);
      setDetailOrder(null);
      window.dispatchEvent(new CustomEvent('wms:notification-refresh'));
    } catch (e: any) {
      setActionMsg(e.message || 'Lỗi');
    }
  };

  const pending = orders.filter((o) => o.statusName === 'PENDING').length;
  const approved = orders.filter((o) => o.statusName === 'APPROVED').length;
  const cancelled = orders.filter((o) => o.statusName === 'CANCELLED' || o.statusName === 'REJECTED').length;

  return (
    <>
      <PageHeader
        title="Quản lý đơn hàng"
        subtitle="Theo dõi và quản lý tất cả đơn hàng"
      />

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 16 }}>
        <div className="stat-card"><div><div className="stat-label">Tổng đơn hàng</div><div className="stat-value">{total}</div></div></div>
        <div className="stat-card"><div><div className="stat-label">Chờ duyệt</div><div className="stat-value">{pending}</div></div></div>
        <div className="stat-card"><div><div className="stat-label">Đã duyệt</div><div className="stat-value">{approved}</div></div></div>
        <div className="stat-card"><div><div className="stat-label">Đã hủy/Từ chối</div><div className="stat-value">{cancelled}</div></div></div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <div style={{ color: 'var(--danger)' }}>{error}</div>
        </div>
      )}

      <div className="card">
        <div className="search-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              placeholder="Tìm kiếm mã đơn, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchOrders(0, search, e.target.value); }}>
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="WAITING_CHECKIN">Chờ nhập kho</option>
            <option value="LATE_CHECKIN">Trễ check-in</option>
            <option value="IMPORTED">Đã nhập kho</option>
            <option value="STORED">Đang lưu kho</option>
            <option value="EXPORTED">Đã xuất kho</option>
            <option value="CANCEL_REQUESTED">Yêu cầu hủy</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CANCELLED">Hủy</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={handleSearch}>Tìm</button>
        </div>

        {loading ? (
          <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th>
                  <th>Ngày nhập</th><th>Ngày xuất</th>
                  <th>Tổng KL (kg)</th><th>Số container</th>
                  <th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={9} style={{ color: 'var(--text2)' }}>Không có đơn hàng nào.</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.orderId}>
                      <td>#{order.orderId}</td>
                      <td>{order.customerName || '—'}</td>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>{order.importDate || '—'}</td>
                      <td>{order.exportDate || '—'}</td>
                      <td>{order.totalGrossWeight != null ? Number(order.totalGrossWeight).toLocaleString() : '—'}</td>
                      <td>{order.containerIds?.length ?? 0}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[order.statusName] || 'badge-gray'}`}>
                          {STATUS_LABEL[order.statusName] || order.statusName}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleView(order.orderId)}>
                          ✏ Xem
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 0', paddingRight: 140, justifyContent: 'flex-start' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => fetchOrders(page - 1)}>←</button>
            <span style={{ lineHeight: '28px', fontSize: 13 }}>{page + 1} / {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => fetchOrders(page + 1)}>→</button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detailOrder !== null || detailLoading) && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setDetailOrder(null); setActionMsg(''); } }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Chi tiết đơn hàng {detailOrder ? `#${detailOrder.orderId}` : ''}</div>
              <button type="button" className="modal-close" onClick={() => { setDetailOrder(null); setActionMsg(''); }}>✕</button>
            </div>
            {detailLoading ? (
              <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải chi tiết...</div>
            ) : detailOrder && (
              <>
                {actionMsg && (
                  <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--text2)', fontSize: 13 }}>
                    {actionMsg}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 16 }}>
                  <div><div style={{ color: 'var(--text2)' }}>Khách hàng</div><div style={{ fontWeight: 500 }}>{detailOrder.customerName || '—'}</div></div>
                  <div><div style={{ color: 'var(--text2)' }}>Trạng thái</div>
                    <span className={`badge ${STATUS_BADGE[detailOrder.statusName] || 'badge-gray'}`}>
                      {STATUS_LABEL[detailOrder.statusName] || detailOrder.statusName}
                    </span>
                  </div>
                  <div><div style={{ color: 'var(--text2)' }}>Điện thoại</div><div style={{ fontWeight: 500 }}>{detailOrder.phone || '—'}</div></div>
                  <div><div style={{ color: 'var(--text2)' }}>Email</div><div style={{ fontWeight: 500 }}>{detailOrder.email || '—'}</div></div>
                  <div><div style={{ color: 'var(--text2)' }}>Ngày nhập kho</div><div style={{ fontWeight: 500 }}>{detailOrder.importDate || '—'}</div></div>
                  <div><div style={{ color: 'var(--text2)' }}>Ngày xuất kho</div><div style={{ fontWeight: 500 }}>{detailOrder.exportDate || '—'}</div></div>
                  {detailOrder.totalGrossWeight != null && (
                    <div><div style={{ color: 'var(--text2)' }}>Tổng trọng lượng</div><div style={{ fontWeight: 500 }}>{Number(detailOrder.totalGrossWeight).toLocaleString()} kg</div></div>
                  )}
                  <div><div style={{ color: 'var(--text2)' }}>Ngày tạo</div>
                    <div style={{ fontWeight: 500 }}>{detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString('vi-VN') : '—'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ color: 'var(--text2)' }}>Địa chỉ</div><div style={{ fontWeight: 500 }}>{detailOrder.address || '—'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ color: 'var(--text2)' }}>Ghi chú</div><div style={{ fontWeight: 500 }}>{detailOrder.note || '—'}</div></div>
                  {detailOrder.containerIds && detailOrder.containerIds.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>Containers</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {detailOrder.containerIds.map((cid) => (
                          <code
                            key={cid}
                            style={{ background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                            title={`Container ${cid}`}
                            onClick={() => window.open(`/warehouse/admin/containers?search=${encodeURIComponent(cid)}`, '_self')}
                          >
                            {cid}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Status transitions for orders past approval, before gate-in.
                    READY_FOR_IMPORT is treated as an alias of WAITING_CHECKIN ("Chờ nhập kho"). */}
                {(['WAITING_CHECKIN', 'LATE_CHECKIN', 'READY_FOR_IMPORT'] as const).includes(detailOrder.statusName as never) && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--bg2)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Chuyển trạng thái check-in</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {CHECKIN_TRANSITIONS.map((s) => {
                        const isCurrent = detailOrder.statusName === s
                          || (s === 'WAITING_CHECKIN' && detailOrder.statusName === 'READY_FOR_IMPORT');
                        return (
                          <button
                            key={s}
                            type="button"
                            className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                            disabled={isCurrent}
                            onClick={() => handleChangeStatus(detailOrder.orderId, s)}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
                      Đơn ở trạng thái <strong>Chờ nhập kho</strong> sẽ xuất hiện trong danh sách container chờ nhập trên sơ đồ 3D.
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setDetailOrder(null); setActionMsg(''); }}>Đóng</button>
                  {detailOrder.statusName === 'PENDING' && (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => handleApprove(detailOrder.orderId)}>✓ Duyệt</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleReject(detailOrder.orderId)}>✕ Từ chối</button>
                    </>
                  )}
                  {detailOrder.statusName === 'CANCEL_REQUESTED' && (
                    <button type="button" className="btn btn-primary" onClick={() => handleApproveCancellation(detailOrder.orderId)}>
                      ✓ Chấp nhận hủy
                    </button>
                  )}
                  {!['CANCELLED', 'EXPORTED', 'COMPLETED', 'REJECTED'].includes(detailOrder.statusName) && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleAdminCancel(detailOrder.orderId)}>
                      Hủy đơn (Admin)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
