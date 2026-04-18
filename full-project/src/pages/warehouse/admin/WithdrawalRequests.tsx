import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

type WithdrawRequest = {
  id: string;
  user_name: string;
  reason: string;
  amount: number | string;
  bank_account: string;
  bank_name: string;
  status: 'pending' | 'approved' | 'rejected';
  transaction_code?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string;
};

const formatVnd = (v: number | string | undefined) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('vi-VN') + ' ₫';
};

export default function WithdrawalRequestsPage() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [items, setItems] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approving, setApproving] = useState<WithdrawRequest | null>(null);
  const [txCode, setTxCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw-requests`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Lỗi tải danh sách');
      const payload = data.data ?? data;
      setItems(payload.items || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openApprove = (item: WithdrawRequest) => {
    setApproving(item);
    setTxCode('');
    setSubmitMsg('');
  };

  const closeApprove = () => {
    setApproving(null);
    setTxCode('');
    setSubmitMsg('');
  };

  const submitApprove = async () => {
    if (!approving) return;
    if (!txCode.trim()) {
      setSubmitMsg('Vui lòng nhập mã giao dịch');
      return;
    }
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw-requests/${approving.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transaction_code: txCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Duyệt yêu cầu thất bại');
      closeApprove();
      await fetchData();
    } catch (e: any) {
      setSubmitMsg(e.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-title">Yêu cầu rút tiền</div>
      <div className="page-subtitle">Xem và xử lý các đơn rút tiền do khách hàng tạo.</div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 16 }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Có lỗi xảy ra</div>
          <div style={{ color: 'var(--text2)' }}>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-subtitle">Đang tải dữ liệu...</div></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số tiền</th>
                  <th>Lý do</th>
                  <th>Ngân hàng</th>
                  <th>STK</th>
                  <th>Trạng thái</th>
                  <th>Mã GD</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={9} style={{ color: 'var(--text2)' }}>Chưa có yêu cầu nào</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.user_name}</td>
                    <td><b>{formatVnd(item.amount)}</b></td>
                    <td>{item.reason}</td>
                    <td>{item.bank_name}</td>
                    <td>{item.bank_account}</td>
                    <td><span className={`badge ${item.status === 'pending' ? 'badge-warning' : item.status === 'approved' ? 'badge-info' : 'badge-danger'}`}>{item.status}</span></td>
                    <td>{item.transaction_code || '-'}</td>
                    <td>{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                    <td>
                      {item.status === 'pending' ? (
                        <button className="btn btn-primary" onClick={() => openApprove(item)}>Xác nhận</button>
                      ) : (
                        <span style={{ color: 'var(--text2)' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {approving && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={closeApprove}
        >
          <div
            className="card"
            style={{ width: 'min(480px, 92vw)', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-title" style={{ marginBottom: 8 }}>Xác nhận yêu cầu rút</div>
            <div style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 14 }}>
              Khách hàng: <b>{approving.user_name}</b><br />
              Số tiền: <b style={{ color: 'var(--primary)' }}>{formatVnd(approving.amount)}</b><br />
              Ngân hàng: <b>{approving.bank_name} — {approving.bank_account}</b><br />
              Lý do: {approving.reason}
            </div>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Mã giao dịch (GD)</label>
            <input
              value={txCode}
              onChange={(e) => setTxCode(e.target.value)}
              placeholder="VD: GD-20260418-0001"
              style={{ width: '100%', padding: '10px 12px', marginTop: 6, border: '1px solid var(--border)', borderRadius: 8 }}
              autoFocus
            />
            {submitMsg && (
              <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13 }}>{submitMsg}</div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={closeApprove} disabled={submitting}>Hủy</button>
              <button className="btn btn-primary" onClick={submitApprove} disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Xác nhận & gửi email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
