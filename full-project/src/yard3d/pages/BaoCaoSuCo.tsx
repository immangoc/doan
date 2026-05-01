import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, RefreshCw, AlertTriangle, ShieldAlert, Info,
  Search, Filter, Shield, Activity, Bell, X, Send,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { apiFetch } from '../services/apiClient';
import { fetchAllYards } from '../services/yardService';
import './KiemSoat.css';

// ─── Types ─────────────────────────────────────────────────────────────────────
type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';
type FilterLevel = 'ALL' | AlertLevel;
type FilterStatus = 'ALL' | 'OPEN' | 'ACKNOWLEDGED';

interface Alert {
  alertId: number;
  zoneName: string;
  zoneId: number | null;
  yardName: string | null;
  level: AlertLevel;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  containerId: string | null;
  reportedByName: string | null;
}

interface ZoneOption {
  zoneId: number;
  zoneName: string;
  yardName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

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

// ─── Fetch alerts ──────────────────────────────────────────────────────────────
async function fetchAlerts(): Promise<Alert[]> {
  const res = await apiFetch('/admin/alerts?size=200&sort=createdAt,desc');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: Rec = await res.json();
  const data: unknown = json.data ?? json;
  let list: Rec[];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Rec;
    list = Array.isArray(obj.content) ? obj.content : [];
  } else {
    list = [];
  }
  return list.map((a: Rec) => ({
    alertId:      Number(a.alertId ?? a.id ?? 0),
    zoneName:     String(a.zoneName ?? a.zone ?? '—'),
    zoneId:       a.zoneId ?? null,
    yardName:     a.yardName ?? null,
    level:        (String(a.levelName ?? a.level ?? a.severity ?? 'INFO').toUpperCase()) as AlertLevel,
    message:      String(a.description ?? a.message ?? ''),
    timestamp:    String(a.createdAt ?? a.timestamp ?? a.date ?? ''),
    acknowledged: a.status === 1 || a.status === '1' || Boolean(a.acknowledged ?? a.isAcknowledged ?? false),
    containerId:  a.containerId ?? null,
    reportedByName: a.reportedByName ?? null,
  }));
}

async function fetchZones(): Promise<ZoneOption[]> {
  try {
    const res = await apiFetch('/admin/yards');
    if (!res.ok) return [];
    const json: Rec = await res.json();
    const yards: Rec[] = Array.isArray(json.data) ? json.data : [];

    const zones: ZoneOption[] = [];

    await Promise.all(yards.map(async (yard) => {
      const yardId = yard.yardId ?? yard.id;
      const yardName = String(yard.yardName ?? yard.name ?? '');
      if (!yardId) return;

      const zRes = await apiFetch(`/admin/yards/${yardId}/zones`);
      if (!zRes.ok) return;
      const zJson = await zRes.json();
      const zoneList: Rec[] = Array.isArray(zJson.data) ? zJson.data : [];

      for (const z of zoneList) {
        zones.push({
          zoneId: Number(z.zoneId ?? z.id ?? 0),
          zoneName: String(z.zoneName ?? z.name ?? ''),
          yardName,
        });
      }
    }));

    return zones;
  } catch {
    return [];
  }
}

// ─── Add Incident Modal ────────────────────────────────────────────────────────
function AddIncidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [level, setLevel] = useState<string>('WARNING');
  const [description, setDescription] = useState('');
  const [selectedYard, setSelectedYard] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('');
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchZones().then(setZones);
  }, []);

  // Unique yards for the first dropdown
  const yardNames = useMemo(() => {
    const seen = new Set<string>();
    return zones.reduce<string[]>((acc, z) => {
      if (!seen.has(z.yardName)) { seen.add(z.yardName); acc.push(z.yardName); }
      return acc;
    }, []);
  }, [zones]);

  // Zones filtered by selected yard
  const filteredZones = useMemo(() => {
    if (!selectedYard) return [];
    return zones.filter(z => z.yardName === selectedYard);
  }, [zones, selectedYard]);

  function handleYardChange(yard: string) {
    setSelectedYard(yard);
    setZoneId(''); // reset zone when yard changes
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Vui lòng nhập mô tả sự cố');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Rec = {
        levelName: level,
        description: description.trim(),
      };
      if (zoneId) body.zoneId = Number(zoneId);
      const res = await apiFetch('/admin/alerts/incident', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tạo báo cáo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ks-modal-overlay" onClick={onClose}>
      <div className="ks-modal" onClick={e => e.stopPropagation()}>
        <div className="ks-modal-header">
          <h3 className="ks-modal-title">Báo cáo sự cố mới</h3>
          <button className="ks-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="ks-modal-body">
          <div className="ks-form-group">
            <label>Mức độ <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="INFO">Thông tin (INFO)</option>
              <option value="WARNING">Cảnh báo (WARNING)</option>
              <option value="CRITICAL">Nghiêm trọng (CRITICAL)</option>
            </select>
          </div>
          <div className="ks-form-group">
            <label>Mô tả sự cố <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              rows={3}
              placeholder="Mô tả chi tiết sự cố..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="ks-form-group">
            <label>Kho (nếu có)</label>
            <select value={selectedYard} onChange={e => handleYardChange(e.target.value)}>
              <option value="">— Không chọn —</option>
              {yardNames.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {selectedYard && (
            <div className="ks-form-group">
              <label>Zone</label>
              <select value={zoneId} onChange={e => setZoneId(e.target.value)}>
                <option value="">— Chọn zone —</option>
                {filteredZones.map(z => (
                  <option key={z.zoneId} value={z.zoneId}>{z.zoneName}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="ks-form-error">{error}</p>}
        </div>
        <div className="ks-modal-actions">
          <button className="ks-btn-cancel" onClick={onClose}>Hủy</button>
          <button
            className="ks-btn-submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send size={14} />
            {submitting ? 'Đang gửi...' : 'Báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function BaoCaoSuCo() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<FilterLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [showModal, setShowModal] = useState(false);

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

  async function handleDelete(alertId: number) {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    setDeleting(prev => new Set(prev).add(alertId));
    try {
      const res = await apiFetch(`/admin/alerts/${alertId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts(prev => prev.filter(a => a.alertId !== alertId));
    } catch {
      alert('Không thể xóa báo cáo');
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(alertId); return s; });
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
        const hay = `${a.zoneName} ${a.message} ${a.level} ${a.containerId || ''}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
  }, [alerts, levelFilter, statusFilter, search]);

  function statusLabel(ack: boolean): string {
    return ack ? 'Đã duyệt' : 'Chờ duyệt';
  }

  return (
    <DashboardLayout>
      <div className="ks-page">

        {/* ── Header ── */}
        <div className="ks-header">
          <div>
            <h1 className="ks-title">Báo cáo sự cố</h1>
            <p className="ks-subtitle">Gửi báo cáo sự cố lên cho quản lý kho xử lý</p>
          </div>
          <div className="ks-header-actions">
            {stats.open > 0 && (
              <span className="ks-open-badge">
                <Bell size={13} />
                {stats.open} chờ duyệt
              </span>
            )}
            <button className="ks-add-btn" onClick={() => setShowModal(true)}>
              <Plus size={14} />
              Thêm báo cáo
            </button>
            <button className="ks-refresh-btn" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'ks-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="ks-kpi-row">
          <KpiCard
            label="Tổng báo cáo"
            value={stats.total}
            icon={<Activity size={20} />}
            color="#3b82f6" bg="#eff6ff"
          />
          <KpiCard
            label="Chờ duyệt"
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
              placeholder="Tìm theo mô tả, container..."
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
              <option value="OPEN">Chờ duyệt</option>
              <option value="ACKNOWLEDGED">Đã duyệt</option>
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
              <Activity size={28} />
              <p>
                {alerts.length === 0
                  ? 'Chưa có báo cáo sự cố nào'
                  : 'Không có báo cáo phù hợp với bộ lọc'}
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
                    {a.yardName && <span>{a.yardName}</span>}
                    {a.yardName && a.zoneName !== '—' && ' — '}
                    {a.zoneName !== '—' ? a.zoneName : ''}
                  </span>
                  <span className="ks-alert-msg">{a.message}</span>
                  <div className="ks-alert-time">
                    <span>{formatTimestamp(a.timestamp)}</span>
                    <span className="ks-alert-ago">{timeAgo(a.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="ks-alert-right">
                <span className={a.acknowledged ? 'ks-status-done' : 'ks-status-pending'}>
                  {statusLabel(a.acknowledged)}
                </span>
                {!a.acknowledged && (
                  <button
                    className="ks-del-btn"
                    onClick={() => handleDelete(a.alertId)}
                    disabled={deleting.has(a.alertId)}
                    title="Xóa báo cáo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <AddIncidentModal
            onClose={() => setShowModal(false)}
            onCreated={load}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
