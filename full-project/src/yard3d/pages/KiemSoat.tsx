import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, CheckCircle, AlertTriangle, ShieldAlert, Info,
  Search, Filter, Bell, Shield, Activity,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { fetchAlerts, acknowledgeAlert } from '../services/alertService';
import type { Alert, AlertLevel } from '../services/alertService';
import './KiemSoat.css';

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, bg, pulse }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; bg: string; pulse?: boolean;
}) {
  return (
    <div className={`ks-kpi${pulse ? ' ks-kpi-pulse' : ''}`}>
      <div className="ks-kpi-icon" style={{ background: bg }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="ks-kpi-body">
        <span className="ks-kpi-value" style={pulse ? { color } : undefined}>{value}</span>
        <span className="ks-kpi-label">{label}</span>
      </div>
    </div>
  );
}

// ─── Level badge ───────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: AlertLevel }) {
  const map: Record<AlertLevel, { cls: string; icon: React.ReactNode }> = {
    CRITICAL: { cls: 'ks-lvl-critical', icon: <ShieldAlert size={12} /> },
    WARNING:  { cls: 'ks-lvl-warning',  icon: <AlertTriangle size={12} /> },
    INFO:     { cls: 'ks-lvl-info',     icon: <Info size={12} /> },
  };
  const { cls, icon } = map[level] ?? map.INFO;
  return <span className={`ks-lvl ${cls}`}>{icon} {level}</span>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

function timeAgo(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type FilterLevel = 'ALL' | AlertLevel;
type FilterStatus = 'ALL' | 'OPEN' | 'ACKNOWLEDGED';

export function KiemSoat() {
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState<Set<number>>(new Set());
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevelFilter] = useState<FilterLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  function load() {
    setLoading(true);
    setError(null);
    fetchAlerts()
      .then((list) => {
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
      // Leave un-acknowledged
    } finally {
      setAckLoading((prev) => { const s = new Set(prev); s.delete(alertId); return s; });
    }
  }

  // ─── Computed ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter(a => !a.acknowledged).length;
    const critical = alerts.filter(a => a.level === 'CRITICAL' && !a.acknowledged).length;
    const warning = alerts.filter(a => a.level === 'WARNING' && !a.acknowledged).length;
    const info = alerts.filter(a => a.level === 'INFO' && !a.acknowledged).length;
    return { total, open, critical, warning, info };
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (levelFilter !== 'ALL' && a.level !== levelFilter) return false;
      if (statusFilter === 'OPEN' && a.acknowledged) return false;
      if (statusFilter === 'ACKNOWLEDGED' && !a.acknowledged) return false;
      if (search.trim()) {
        const k = search.trim().toLowerCase();
        const hay = `${a.zoneName} ${a.message} ${a.level}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
  }, [alerts, levelFilter, statusFilter, search]);

  return (
    <DashboardLayout>
      <div className="ks-page">

        {/* ── Header ── */}
        <div className="ks-header">
          <div>
            <h1 className="ks-title">Kiểm soát &amp; Sự cố</h1>
            <p className="ks-subtitle">Theo dõi cảnh báo hệ thống — phân loại theo mức độ nghiêm trọng</p>
          </div>
          <div className="ks-header-actions">
            {stats.open > 0 && (
              <span className="ks-open-badge">
                <Bell size={13} />
                {stats.open} chưa xử lý
              </span>
            )}
            <button className="ks-refresh-btn" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'ks-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="ks-kpi-row">
          <KpiCard
            label="Tổng cảnh báo"
            value={stats.total}
            icon={<Activity size={20} />}
            color="#3b82f6" bg="#eff6ff"
          />
          <KpiCard
            label="Chưa xử lý"
            value={stats.open}
            icon={<Bell size={20} />}
            color="#f59e0b" bg="#fffbeb"
            pulse={stats.open > 0}
          />
          <KpiCard
            label="Nghiêm trọng"
            value={stats.critical}
            icon={<ShieldAlert size={20} />}
            color="#ef4444" bg="#fef2f2"
            pulse={stats.critical > 0}
          />
          <KpiCard
            label="Cảnh báo"
            value={stats.warning}
            icon={<AlertTriangle size={20} />}
            color="#f59e0b" bg="#fffbeb"
          />
          <KpiCard
            label="Thông tin"
            value={stats.info}
            icon={<Info size={20} />}
            color="#3b82f6" bg="#eff6ff"
          />
        </div>

        {/* ── Filters ── */}
        <div className="ks-filter-bar">
          <div className="ks-search-wrap">
            <Search size={14} className="ks-search-ico" />
            <input
              type="text"
              placeholder="Tìm theo khu vực, nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ks-filter-group">
            <Filter size={14} />
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as FilterLevel)}>
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nghiêm trọng</option>
              <option value="WARNING">Cảnh báo</option>
              <option value="INFO">Thông tin</option>
            </select>
          </div>
          <div className="ks-filter-group">
            <Shield size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="OPEN">Chờ xử lý</option>
              <option value="ACKNOWLEDGED">Đã xử lý</option>
            </select>
          </div>
          <span className="ks-result-count">
            {filtered.length} / {alerts.length} kết quả
          </span>
        </div>

        {/* ── Alert List ── */}
        <div className="ks-list-wrap">
          {loading && (
            <div className="ks-empty-state">
              <RefreshCw size={28} className="ks-spin" />
              <p>Đang tải dữ liệu...</p>
            </div>
          )}
          {!loading && error && (
            <div className="ks-empty-state ks-error-state">
              <ShieldAlert size={28} />
              <p>{error}</p>
              <button className="ks-refresh-btn" onClick={load}>Thử lại</button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="ks-empty-state">
              <CheckCircle size={28} />
              <p>
                {alerts.length === 0
                  ? 'Không có cảnh báo nào trong hệ thống'
                  : 'Không có cảnh báo phù hợp với bộ lọc'}
              </p>
            </div>
          )}
          {!loading && !error && filtered.map((a) => (
            <div
              key={a.alertId}
              className={`ks-alert-card ${a.acknowledged ? 'ks-alert-ack' : ''} ${
                !a.acknowledged && a.level === 'CRITICAL' ? 'ks-alert-critical' :
                !a.acknowledged && a.level === 'WARNING' ? 'ks-alert-warning' : ''
              }`}
            >
              <div className="ks-alert-left">
                <LevelBadge level={a.level} />
                <div className="ks-alert-content">
                  <span className="ks-alert-zone">
                    {a.yardName && <span>{a.yardName} — </span>}
                    {a.zoneName}
                  </span>
                  <span className="ks-alert-msg">{a.message}</span>
                  <div className="ks-alert-time">
                    {a.reportedByName && (
                      <span className="ks-reporter">👤 {a.reportedByName}</span>
                    )}
                    <span>{formatTimestamp(a.timestamp)}</span>
                    <span className="ks-alert-ago">{timeAgo(a.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="ks-alert-right">
                {a.acknowledged ? (
                  <span className="ks-status-done">
                    <CheckCircle size={14} />
                    Đã xử lý
                  </span>
                ) : (
                  <button
                    className="ks-ack-btn"
                    onClick={() => handleAcknowledge(a.alertId)}
                    disabled={ackLoading.has(a.alertId)}
                  >
                    <CheckCircle size={14} />
                    {ackLoading.has(a.alertId) ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
