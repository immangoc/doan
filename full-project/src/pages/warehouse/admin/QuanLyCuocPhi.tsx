import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type FeeConfig = {
  configId?: number;
  currency?: string;
  costRate?: number;
  ratePerKgDefault?: number;
  ratePerKgByCargoType?: Record<string, number>;
  liftingFeePerMove?: number;
  overduePenaltyRate?: number;
  coldStorageSurcharge?: number;
  hazmatSurcharge?: number;
  freeStorageDays?: number;
  storageMultiplier?: number;
  weightMultiplier?: number;
  containerRate20ft?: number;
  containerRate40ft?: number;
  earlyPickupFee?: number;
  updatedAt?: string;
};

type SectionKey = 'basic' | 'cargoType' | 'lifting' | 'overdue' | 'cold' | 'hazmat' | 'multipliers';

const fmt = (v?: number | null) => (v != null ? v.toLocaleString('vi-VN') : '—');

export default function QuanLyCuocPhi() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Track which section is being edited
  const [editSection, setEditSection] = useState<SectionKey | null>(null);

  // Edit forms per section
  const [basicForm, setBasicForm] = useState({ currency: 'VND', costRate: '', ratePerKgDefault: '' });
  const [liftingForm, setLiftingForm] = useState({ liftingFeePerMove: '' });
  const [overdueForm, setOverdueForm] = useState({ overduePenaltyRate: '', freeStorageDays: '' });
  const [coldForm, setColdForm] = useState({ coldStorageSurcharge: '' });
  const [hazmatForm, setHazmatForm] = useState({ hazmatSurcharge: '' });
  const [cargoTypeForm, setCargoTypeForm] = useState<Record<string, string>>({});
  const [multipliersForm, setMultipliersForm] = useState({
    storageMultiplier: '', weightMultiplier: '',
    containerRate20ft: '', containerRate40ft: '', earlyPickupFee: '',
  });

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

  const startEdit = (section: SectionKey) => {
    if (!config) return;
    setSaveMsg('');
    if (section === 'basic') {
      setBasicForm({
        currency: config.currency || 'VND',
        costRate: config.costRate != null ? String(config.costRate) : '',
        ratePerKgDefault: config.ratePerKgDefault != null ? String(config.ratePerKgDefault) : '',
      });
    } else if (section === 'lifting') {
      setLiftingForm({ liftingFeePerMove: config.liftingFeePerMove != null ? String(config.liftingFeePerMove) : '' });
    } else if (section === 'overdue') {
      setOverdueForm({
        overduePenaltyRate: config.overduePenaltyRate != null ? String(config.overduePenaltyRate) : '',
        freeStorageDays: config.freeStorageDays != null ? String(config.freeStorageDays) : '',
      });
    } else if (section === 'cold') {
      setColdForm({ coldStorageSurcharge: config.coldStorageSurcharge != null ? String(config.coldStorageSurcharge) : '' });
    } else if (section === 'hazmat') {
      setHazmatForm({ hazmatSurcharge: config.hazmatSurcharge != null ? String(config.hazmatSurcharge) : '' });
    } else if (section === 'cargoType') {
      const init: Record<string, string> = {};
      Object.entries(config.ratePerKgByCargoType || {}).forEach(([k, v]) => { init[k] = String(v); });
      setCargoTypeForm(init);
    } else if (section === 'multipliers') {
      setMultipliersForm({
        storageMultiplier: config.storageMultiplier != null ? String(config.storageMultiplier) : '',
        weightMultiplier:  config.weightMultiplier  != null ? String(config.weightMultiplier)  : '',
        containerRate20ft: config.containerRate20ft != null ? String(config.containerRate20ft) : '',
        containerRate40ft: config.containerRate40ft != null ? String(config.containerRate40ft) : '',
        earlyPickupFee:    config.earlyPickupFee    != null ? String(config.earlyPickupFee)    : '',
      });
    }
    setEditSection(section);
  };

  const cancelEdit = () => setEditSection(null);

  const saveSection = async (body: Record<string, any>) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API_BASE}/admin/fees`, { method: 'PUT', headers, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi cập nhật');
      setConfig(d.data);
      setEditSection(null);
      setSaveMsg('Đã cập nhật thành công.');
    } catch (e: any) {
      setSaveMsg(e.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const saveBasic = () => {
    const body: Record<string, any> = { currency: basicForm.currency || 'VND' };
    if (basicForm.costRate !== '') body.costRate = parseFloat(basicForm.costRate);
    if (basicForm.ratePerKgDefault !== '') body.ratePerKgDefault = parseFloat(basicForm.ratePerKgDefault);
    saveSection(body);
  };

  const saveLifting = () => {
    const body: Record<string, any> = {};
    if (liftingForm.liftingFeePerMove !== '') body.liftingFeePerMove = parseFloat(liftingForm.liftingFeePerMove);
    saveSection(body);
  };

  const saveOverdue = () => {
    const body: Record<string, any> = {};
    if (overdueForm.overduePenaltyRate !== '') body.overduePenaltyRate = parseFloat(overdueForm.overduePenaltyRate);
    if (overdueForm.freeStorageDays !== '') body.freeStorageDays = parseInt(overdueForm.freeStorageDays, 10);
    saveSection(body);
  };

  const saveCold = () => {
    const body: Record<string, any> = {};
    if (coldForm.coldStorageSurcharge !== '') body.coldStorageSurcharge = parseFloat(coldForm.coldStorageSurcharge);
    saveSection(body);
  };

  const saveHazmat = () => {
    const body: Record<string, any> = {};
    if (hazmatForm.hazmatSurcharge !== '') body.hazmatSurcharge = parseFloat(hazmatForm.hazmatSurcharge);
    saveSection(body);
  };

  const saveMultipliers = () => {
    const body: Record<string, any> = {};
    if (multipliersForm.storageMultiplier !== '') body.storageMultiplier = parseFloat(multipliersForm.storageMultiplier);
    if (multipliersForm.weightMultiplier  !== '') body.weightMultiplier  = parseFloat(multipliersForm.weightMultiplier);
    if (multipliersForm.containerRate20ft !== '') body.containerRate20ft = parseFloat(multipliersForm.containerRate20ft);
    if (multipliersForm.containerRate40ft !== '') body.containerRate40ft = parseFloat(multipliersForm.containerRate40ft);
    if (multipliersForm.earlyPickupFee    !== '') body.earlyPickupFee    = parseFloat(multipliersForm.earlyPickupFee);
    saveSection(body);
  };

  const saveCargoType = () => {
    const ratePerKgByCargoType: Record<string, number> = {};
    Object.entries(cargoTypeForm).forEach(([k, v]) => {
      if (k.trim() && v !== '') ratePerKgByCargoType[k.trim()] = parseFloat(v);
    });
    saveSection({ ratePerKgByCargoType });
  };

  const addCargoTypeRow = () => {
    setCargoTypeForm((prev) => ({ ...prev, '': '' }));
  };

  const updateCargoTypeKey = (oldKey: string, newKey: string) => {
    setCargoTypeForm((prev) => {
      const updated: Record<string, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        updated[k === oldKey ? newKey : k] = v;
      });
      return updated;
    });
  };

  const updateCargoTypeVal = (key: string, val: string) => {
    setCargoTypeForm((prev) => ({ ...prev, [key]: val }));
  };

  const removeCargoTypeRow = (key: string) => {
    setCargoTypeForm((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const SectionHeader = ({ title, section }: { title: string; section: SectionKey }) => (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {editSection !== section && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(section)}>✏ Sửa</button>
      )}
    </div>
  );

  const ActionRow = ({ onSave }: { onSave: () => void }) => (
    <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: 4 }}>
      <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Hủy</button>
      <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Quản lý cước phí"
        subtitle="Cấu hình 6 biểu phí lưu kho"
      />

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <div style={{ color: 'var(--danger)' }}>{error}</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={fetchData}>Thử lại</button>
        </div>
      )}

      {saveMsg && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--success)', fontSize: 13 }}>{saveMsg}</div>
        </div>
      )}

      {loading ? (
        <div className="card"><div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div></div>
      ) : config && (
        <>
          {/* 1. Phí cơ bản */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="1. Phí lưu kho cơ bản" section="basic" />
            {editSection !== 'basic' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="stat-card"><div className="stat-label">Đơn vị tiền tệ</div><div className="stat-value" style={{ fontSize: 20 }}>{config.currency || '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Tỉ lệ phí cơ bản</div><div className="stat-value" style={{ fontSize: 20 }}>{config.costRate ?? '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Phí/kg mặc định</div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.ratePerKgDefault)} {config.currency}</div></div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Đơn vị tiền tệ</label>
                  <input className="form-input" value={basicForm.currency} onChange={(e) => setBasicForm((p) => ({ ...p, currency: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tỉ lệ phí cơ bản</label>
                  <input className="form-input" type="number" step="0.0001" min="0" value={basicForm.costRate} onChange={(e) => setBasicForm((p) => ({ ...p, costRate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phí/kg mặc định</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={basicForm.ratePerKgDefault} onChange={(e) => setBasicForm((p) => ({ ...p, ratePerKgDefault: e.target.value }))} />
                </div>
                <ActionRow onSave={saveBasic} />
              </div>
            )}
          </div>

          {/* 2. Phí theo loại hàng */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="2. Phí theo loại hàng (VND/kg)" section="cargoType" />
            {editSection !== 'cargoType' ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Loại hàng</th><th>Phí/kg ({config.currency})</th></tr></thead>
                  <tbody>
                    {Object.keys(config.ratePerKgByCargoType || {}).length === 0 ? (
                      <tr><td colSpan={2} style={{ color: 'var(--text2)' }}>Chưa có cấu hình theo loại hàng.</td></tr>
                    ) : (
                      Object.entries(config.ratePerKgByCargoType!).map(([type, rate]) => (
                        <tr key={type}><td>{type}</td><td>{fmt(rate)}</td></tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <div className="table-wrap" style={{ marginBottom: 8 }}>
                  <table>
                    <thead><tr><th>Loại hàng</th><th>Phí/kg</th><th></th></tr></thead>
                    <tbody>
                      {Object.entries(cargoTypeForm).map(([key, val]) => (
                        <tr key={key}>
                          <td><input className="form-input" style={{ minWidth: 140 }} value={key} onChange={(e) => updateCargoTypeKey(key, e.target.value)} /></td>
                          <td><input className="form-input" type="number" step="0.01" min="0" style={{ minWidth: 120 }} value={val} onChange={(e) => updateCargoTypeVal(key, e.target.value)} /></td>
                          <td><button type="button" className="btn btn-danger btn-sm" onClick={() => removeCargoTypeRow(key)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addCargoTypeRow} style={{ marginBottom: 8 }}>+ Thêm loại hàng</button>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={saveCargoType} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Phí nâng hạ */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="3. Phí nâng hạ container" section="lifting" />
            {editSection !== 'lifting' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="stat-card"><div className="stat-label">Phí nâng/hạ mỗi lần</div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.liftingFeePerMove)} {config.currency}</div></div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phí nâng/hạ mỗi lần ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={liftingForm.liftingFeePerMove} onChange={(e) => setLiftingForm({ liftingFeePerMove: e.target.value })} />
                </div>
                <ActionRow onSave={saveLifting} />
              </div>
            )}
          </div>

          {/* 4. Phí quá hạn */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="4. Phí quá hạn lưu bãi" section="overdue" />
            {editSection !== 'overdue' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="stat-card"><div className="stat-label">Miễn phí lưu kho (ngày)</div><div className="stat-value" style={{ fontSize: 20 }}>{config.freeStorageDays ?? '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Tỉ lệ phạt/ngày quá hạn</div><div className="stat-value" style={{ fontSize: 20 }}>{config.overduePenaltyRate ?? '—'}</div></div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số ngày miễn phí</label>
                  <input className="form-input" type="number" min="0" step="1" value={overdueForm.freeStorageDays} onChange={(e) => setOverdueForm((p) => ({ ...p, freeStorageDays: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tỉ lệ phạt/ngày (0.01 = 1%)</label>
                  <input className="form-input" type="number" step="0.0001" min="0" value={overdueForm.overduePenaltyRate} onChange={(e) => setOverdueForm((p) => ({ ...p, overduePenaltyRate: e.target.value }))} />
                </div>
                <ActionRow onSave={saveOverdue} />
              </div>
            )}
          </div>

          {/* 5. Phụ thu kho lạnh */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="5. Phụ thu kho lạnh" section="cold" />
            {editSection !== 'cold' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="stat-card"><div className="stat-label">Phụ thu kho lạnh</div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.coldStorageSurcharge)} {config.currency}</div></div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phụ thu kho lạnh ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={coldForm.coldStorageSurcharge} onChange={(e) => setColdForm({ coldStorageSurcharge: e.target.value })} />
                </div>
                <ActionRow onSave={saveCold} />
              </div>
            )}
          </div>

          {/* 6. Phụ thu hàng nguy hiểm */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="6. Phụ thu hàng nguy hiểm (Hazmat)" section="hazmat" />
            {editSection !== 'hazmat' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="stat-card"><div className="stat-label">Phụ thu Hazmat</div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.hazmatSurcharge)} {config.currency}</div></div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phụ thu Hazmat ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={hazmatForm.hazmatSurcharge} onChange={(e) => setHazmatForm({ hazmatSurcharge: e.target.value })} />
                </div>
                <ActionRow onSave={saveHazmat} />
              </div>
            )}
          </div>

          {/* 7. Hệ số nhân & phí container theo loại */}
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="7. Hệ số nhân & phí container theo loại" section="multipliers" />
            {editSection !== 'multipliers' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="stat-card">
                  <div className="stat-label">Hệ số lưu kho</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{config.storageMultiplier ?? 1}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Hệ số trọng lượng</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{config.weightMultiplier ?? 1}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Phí xuất sớm</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.earlyPickupFee)} {config.currency}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Giá container 20ft</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.containerRate20ft)} {config.currency}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Giá container 40ft</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{fmt(config.containerRate40ft)} {config.currency}</div>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hệ số lưu kho (storage_multiplier)</label>
                  <input className="form-input" type="number" step="0.0001" min="0" value={multipliersForm.storageMultiplier} onChange={(e) => setMultipliersForm((p) => ({ ...p, storageMultiplier: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hệ số trọng lượng (weight_multiplier)</label>
                  <input className="form-input" type="number" step="0.0001" min="0" value={multipliersForm.weightMultiplier} onChange={(e) => setMultipliersForm((p) => ({ ...p, weightMultiplier: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá base container 20ft ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={multipliersForm.containerRate20ft} onChange={(e) => setMultipliersForm((p) => ({ ...p, containerRate20ft: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá base container 40ft ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={multipliersForm.containerRate40ft} onChange={(e) => setMultipliersForm((p) => ({ ...p, containerRate40ft: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phí xuất sớm ({config.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={multipliersForm.earlyPickupFee} onChange={(e) => setMultipliersForm((p) => ({ ...p, earlyPickupFee: e.target.value }))} />
                </div>
                <ActionRow onSave={saveMultipliers} />
              </div>
            )}
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6, fontSize: 12, color: 'var(--text2)' }}>
              Công thức: <strong>Phí = base_price × số ngày × hệ số lưu kho × hệ số trọng lượng</strong>
            </div>
          </div>

          {config.updatedAt && (
            <div style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'right' }}>
              Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}
            </div>
          )}
        </>
      )}
    </>
  );
}
