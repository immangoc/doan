import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type FeeConfig = {
  configId?: number;
  currency?: string;
  costRate?: number;
  ratePerKgDefault?: number;
  ratePerKgByCargoType?: Record<string, number>;
  updatedAt?: string;
};

export default function QuanLyCuocPhi() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ currency: 'USD', costRate: '', ratePerKgDefault: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/fees`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải cấu hình phí');
      setConfig(d.data);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = () => {
    if (!config) return;
    setForm({
      currency: config.currency || 'USD',
      costRate: config.costRate != null ? String(config.costRate) : '',
      ratePerKgDefault: config.ratePerKgDefault != null ? String(config.ratePerKgDefault) : '',
    });
    setSaveMsg('');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const body: Record<string, any> = {
        currency: form.currency || 'USD',
      };
      if (form.costRate !== '') body.costRate = parseFloat(form.costRate);
      if (form.ratePerKgDefault !== '') body.ratePerKgDefault = parseFloat(form.ratePerKgDefault);
      const res = await fetch(`${API_BASE}/admin/fees`, { method: 'PUT', headers, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi cập nhật cấu hình');
      setConfig(d.data);
      setEditing(false);
      setSaveMsg('Đã cập nhật cấu hình phí.');
    } catch (e: any) {
      setSaveMsg(e.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý cước phí"
        subtitle="Cấu hình biểu phí lưu kho và phí theo loại hàng"
      />

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <div style={{ color: 'var(--danger)' }}>{error}</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={fetchData}>Thử lại</button>
        </div>
      )}

      {saveMsg && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>{saveMsg}</div>
        </div>
      )}

      {loading ? (
        <div className="card"><div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div></div>
      ) : config && (
        <>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Cấu hình phí hiện tại</div>
                {config.updatedAt && (
                  <div className="card-subtitle">Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}</div>
                )}
              </div>
              {!editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>✏ Chỉnh sửa</button>
              )}
            </div>

            {!editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '8px 0' }}>
                <div className="stat-card">
                  <div>
                    <div className="stat-label">Đơn vị tiền tệ</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{config.currency || '—'}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <div className="stat-label">Phí cơ bản (cost rate)</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{config.costRate != null ? config.costRate : '—'}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <div className="stat-label">Phí/kg mặc định</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{config.ratePerKgDefault != null ? config.ratePerKgDefault : '—'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Đơn vị tiền tệ</label>
                  <input className="form-input" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phí cơ bản (cost rate)</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={form.costRate} onChange={(e) => setForm((p) => ({ ...p, costRate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phí/kg mặc định</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={form.ratePerKgDefault} onChange={(e) => setForm((p) => ({ ...p, ratePerKgDefault: e.target.value }))} />
                </div>
                <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {config.ratePerKgByCargoType && Object.keys(config.ratePerKgByCargoType).length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Phí theo loại hàng</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Loại hàng</th><th>Phí/kg</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(config.ratePerKgByCargoType).map(([type, rate]) => (
                      <tr key={type}>
                        <td>{type}</td>
                        <td>{rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
