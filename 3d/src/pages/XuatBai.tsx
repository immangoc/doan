import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { reportContainerDamage, searchInYardContainers } from '../services/gateOutService';
import type { InYardContainer } from '../services/gateOutService';
import { performGateOutForManagement, fetchGateOutInvoice } from '../services/gateOutManagementService';
import type { GateOutInvoice } from '../services/gateOutManagementService';
import './management.css';

// ─── Invoice modal ────────────────────────────────────────────────────────────
function fmtMoney(val?: number): string {
  return val != null && Number.isFinite(val)
    ? val.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : '—';
}

function fmtTime(raw?: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('vi-VN');
}

function InvoiceModal({ invoice, onClose }: { invoice: GateOutInvoice; onClose: () => void }) {
  return (
    <div className="mgmt-modal-overlay" onClick={onClose}>
      <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-modal-header">
          <h3 className="mgmt-modal-title">Hóa đơn xuất kho #{invoice.invoiceId}</h3>
          <button className="mgmt-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div>
          {[
            ['Mã container',    invoice.containerId],
            ['Loại hàng',       invoice.cargoType || '—'],
            ['Thời gian nhập',  fmtTime(invoice.gateInTime)],
            ['Thời gian xuất',  fmtTime(invoice.gateOutTime)],
            ['Số ngày lưu kho', `${invoice.storageDays} ngày`],
            ['Phí / ngày',      fmtMoney(invoice.dailyRate)],
            ['Phí cơ bản',      fmtMoney(invoice.baseFee)],
            ...(invoice.isOverdue ? [['Phạt quá hạn', fmtMoney(invoice.overduePenalty)]] : []),
          ].map(([label, value]) => (
            <div key={label} className="mgmt-invoice-row">
              <span className="mgmt-invoice-label">{label}</span>
              <span className="mgmt-invoice-value">{value}</span>
            </div>
          ))}
          <div className="mgmt-invoice-row mgmt-invoice-total">
            <span className="mgmt-invoice-label">Tổng cộng</span>
            <span className="mgmt-invoice-value">{fmtMoney(invoice.totalFee)}</span>
          </div>
        </div>
        <div className="mgmt-modal-actions">
          <button className="mgmt-action-btn mgmt-action-btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm gate-out modal ───────────────────────────────────────────────────
function ConfirmModal({ container, onConfirm, onCancel, loading, error }: {
  container: InYardContainer;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="mgmt-modal-overlay" onClick={loading ? undefined : onCancel}>
      <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-modal-header">
          <h3 className="mgmt-modal-title">Xác nhận xuất bãi</h3>
          <button className="mgmt-modal-close" onClick={onCancel} disabled={loading}><X size={18} /></button>
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{error}</p>}
        <div>
          {[
            ['Mã container', container.containerCode],
            ['Loại hàng',    container.cargoType],
            ['Kho',          container.whName],
            ['Zone',         container.zone],
            ['Vị trí',       container.slot],
          ].map(([label, value]) => (
            <div key={label} className="mgmt-invoice-row">
              <span className="mgmt-invoice-label">{label}</span>
              <span className="mgmt-invoice-value">{value}</span>
            </div>
          ))}
        </div>
        <div className="mgmt-modal-actions">
          <button className="mgmt-action-btn mgmt-action-btn-secondary" onClick={onCancel} disabled={loading}>Hủy</button>
          <button className="mgmt-action-btn mgmt-action-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận xuất kho'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function XuatBai() {
  const [containers, setContainers]     = useState<InYardContainer[]>([]);
  const [searchCode, setSearchCode]     = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<InYardContainer | null>(null);
  const [gateOutLoading, setGateOutLoading] = useState(false);
  const [gateOutError, setGateOutError]     = useState<string | null>(null);

  const [invoice, setInvoice] = useState<GateOutInvoice | null>(null);
  const [damageLoading, setDamageLoading] = useState<Set<string>>(new Set());

  const doSearch = useCallback((keyword: string) => {
    setFetchLoading(true);
    setFetchError(null);
    searchInYardContainers(keyword)
      .then(setContainers)
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setFetchLoading(false));
  }, []);

  useEffect(() => { doSearch(''); }, [doSearch]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchCode), 300);
    return () => clearTimeout(t);
  }, [searchCode, doSearch]);

  async function handleGateOut() {
    if (!confirmTarget) return;
    setGateOutLoading(true);
    setGateOutError(null);
    try {
      const gateOutId = await performGateOutForManagement(confirmTarget.containerId);
      setContainers((prev) => prev.filter((c) => c.containerId !== confirmTarget.containerId));
      setConfirmTarget(null);
      // Fetch invoice to display
      try {
        const inv = await fetchGateOutInvoice(gateOutId);
        setInvoice(inv);
      } catch {
        // Invoice fetch is non-critical; gate-out already succeeded
      }
    } catch (e) {
      setGateOutError(e instanceof Error ? e.message : 'Xuất kho thất bại');
    } finally {
      setGateOutLoading(false);
    }
  }

  async function handleReportDamage(containerCode: string) {
    setDamageLoading((prev) => new Set(prev).add(containerCode));
    try {
      await reportContainerDamage(containerCode);
      setContainers((prev) => prev.filter((c) => c.containerId !== containerCode));
    } catch (e) {
      // keep row if fails
      // eslint-disable-next-line no-alert
      alert(e instanceof Error ? e.message : 'Báo hỏng thất bại');
    } finally {
      setDamageLoading((prev) => { const s = new Set(prev); s.delete(containerCode); return s; });
    }
  }

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Quản lý Xuất Bãi</h1>
            <p>Container đang trong bãi — chọn để thực hiện xuất kho</p>
          </div>
        </div>

        <div className="mgmt-filter-bar">
          <div className="mgmt-search-wrap">
            <Search size={14} className="mgmt-search-ico" />
            <input
              type="text"
              placeholder="Tìm mã container..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {fetchLoading ? 'Đang tải...' : `${containers.length} container`}
          </span>
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Mã container</th>
                <th>Loại hàng</th>
                <th>Loại</th>
                <th>Kho</th>
                <th>Zone</th>
                <th>Vị trí</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading && (
                <tr className="mgmt-state-row">
                  <td colSpan={7}>Đang tải dữ liệu...</td>
                </tr>
              )}
              {!fetchLoading && fetchError && (
                <tr className="mgmt-state-row mgmt-state-error">
                  <td colSpan={7}>{fetchError}</td>
                </tr>
              )}
              {!fetchLoading && !fetchError && containers.length === 0 && (
                <tr className="mgmt-state-row">
                  <td colSpan={7}>Không tìm thấy container trong bãi</td>
                </tr>
              )}
              {!fetchLoading && !fetchError && containers.map((c) => (
                <tr key={c.containerId}>
                  <td><strong>{c.containerCode}</strong></td>
                  <td>{c.cargoType || '—'}</td>
                  <td>
                    <span className="mgmt-badge mgmt-badge-neutral">{c.containerType}</span>
                  </td>
                  <td>{c.whName}</td>
                  <td>{c.zone}</td>
                  <td>{c.slot}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        className="mgmt-action-btn mgmt-action-btn-secondary"
                        onClick={() => handleReportDamage(c.containerId)}
                        disabled={damageLoading.has(c.containerId)}
                        title="Báo hỏng (đẩy lên quản lý kho xử lý)"
                      >
                        {damageLoading.has(c.containerId) ? '...' : 'Báo hỏng'}
                      </button>
                      <button
                        className="mgmt-action-btn mgmt-action-btn-danger"
                        onClick={() => { setConfirmTarget(c); setGateOutError(null); }}
                      >
                        Xuất kho
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {confirmTarget && (
          <ConfirmModal
            container={confirmTarget}
            onConfirm={handleGateOut}
            onCancel={() => { if (!gateOutLoading) { setConfirmTarget(null); setGateOutError(null); } }}
            loading={gateOutLoading}
            error={gateOutError}
          />
        )}

        {invoice && (
          <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />
        )}

      </div>
    </DashboardLayout>
  );
}
