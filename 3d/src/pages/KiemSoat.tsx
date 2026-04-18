import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchAlerts, acknowledgeAlert } from '../services/alertService';
import type { Alert, AlertLevel } from '../services/alertService';
import './management.css';

function levelBadgeClass(level: AlertLevel): string {
  if (level === 'CRITICAL') return 'mgmt-badge mgmt-badge-critical';
  if (level === 'WARNING')  return 'mgmt-badge mgmt-badge-warning';
  return 'mgmt-badge mgmt-badge-info';
}

function rowBgClass(level: AlertLevel, acknowledged: boolean): string {
  if (acknowledged) return 'mgmt-row-dimmed';
  if (level === 'CRITICAL') return 'mgmt-row-critical';
  if (level === 'WARNING')  return 'mgmt-row-warning';
  return '';
}

function formatTimestamp(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

export function KiemSoat() {
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState<Set<number>>(new Set());

  function load() {
    setLoading(true);
    setError(null);
    fetchAlerts()
      .then((list) => {
        // Unacknowledged first, then acknowledged; within each group: CRITICAL > WARNING > INFO
        const order: Record<AlertLevel, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        const sorted = [...list].sort((a, b) => {
          if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
          return order[a.level] - order[b.level];
        });
        setAlerts(sorted);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAcknowledge(alertId: number) {
    setAckLoading((prev) => new Set(prev).add(alertId));
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev
          .map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
          .sort((a, b) => {
            if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
            const order: Record<AlertLevel, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
            return order[a.level] - order[b.level];
          }),
      );
    } catch {
      // Leave the alert un-acknowledged in UI if API fails
    } finally {
      setAckLoading((prev) => { const s = new Set(prev); s.delete(alertId); return s; });
    }
  }

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <DashboardLayout>
      <div className="mgmt-page">

        <div className="mgmt-header">
          <div className="mgmt-header-text">
            <h1>Kiểm soát &amp; Sự cố</h1>
            <p>Danh sách cảnh báo hệ thống — phân loại theo mức độ nghiêm trọng</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!loading && !error && unacknowledgedCount > 0 && (
              <span className="mgmt-badge mgmt-badge-critical">
                {unacknowledgedCount} chưa xử lý
              </span>
            )}
            <button
              className="mgmt-apply-btn"
              onClick={load}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>
          </div>
        </div>

        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Mức độ</th>
                <th>Khu vực</th>
                <th>Nội dung cảnh báo</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th></th>
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
              {!loading && !error && alerts.length === 0 && (
                <tr className="mgmt-state-row">
                  <td colSpan={6}>Không có cảnh báo nào</td>
                </tr>
              )}
              {!loading && !error && alerts.map((a) => (
                <tr
                  key={a.alertId}
                  className={rowBgClass(a.level, a.acknowledged)}
                >
                  <td>
                    <span className={levelBadgeClass(a.level)}>{a.level}</span>
                  </td>
                  <td>{a.zoneName}</td>
                  <td style={{ maxWidth: 320 }}>{a.message}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(a.timestamp)}</td>
                  <td>
                    {a.acknowledged ? (
                      <span className="mgmt-badge mgmt-badge-success">Đã xử lý</span>
                    ) : (
                      <span className="mgmt-badge mgmt-badge-neutral">Chờ xử lý</span>
                    )}
                  </td>
                  <td>
                    {!a.acknowledged && (
                      <button
                        className="mgmt-action-btn mgmt-action-btn-secondary"
                        onClick={() => handleAcknowledge(a.alertId)}
                        disabled={ackLoading.has(a.alertId)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <CheckCircle size={13} />
                        {ackLoading.has(a.alertId) ? '...' : 'Xác nhận'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}
