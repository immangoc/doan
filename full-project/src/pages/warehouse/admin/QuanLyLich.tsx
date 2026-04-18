import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type Schedule = {
  scheduleId: number;
  companyName?: string;
  shipName?: string;
  type?: string;
  shipType?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  containers?: number;
  status?: string;
  createdAt?: string;
};

type ShippingCompany = { companyId: number; name: string };

type ScheduleForm = {
  companyName: string;
  shipName: string;
  type: string;
  shipType: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  containers: string;
  status: string;
};

const EMPTY_FORM: ScheduleForm = {
  companyName: '', shipName: '', type: 'IMPORT', shipType: '',
  timeStart: '', timeEnd: '', location: '',
  containers: '', status: 'SCHEDULED',
};

export default function QuanLyLich() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [data, setData] = useState<Schedule[]>([]);
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [schedRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/admin/schedules`, { headers }),
        fetch(`${API_BASE}/admin/shipping-companies`, { headers }),
      ]);
      const sd = await schedRes.json();
      const cd = await compRes.json();
      if (!schedRes.ok) throw new Error(sd.message || 'Lỗi tải lịch trình');
      setData(sd.data || []);
      if (compRes.ok) setCompanies(cd.data || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (item: Schedule) => {
    setEditItem(item);
    setForm({
      companyName: item.companyName || '',
      shipName: item.shipName || '',
      type: item.type || 'IMPORT',
      shipType: item.shipType || '',
      timeStart: item.timeStart ? item.timeStart.slice(0, 16) : '',
      timeEnd: item.timeEnd ? item.timeEnd.slice(0, 16) : '',
      location: item.location || '',
      containers: item.containers != null ? String(item.containers) : '',
      status: item.status || 'SCHEDULED',
    });
    setFormError('');
    setOpen(true);
  };

  const closeModal = () => { setOpen(false); setEditItem(null); setFormError(''); };

  const setField = (key: keyof ScheduleForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.companyName.trim() && !form.shipName.trim()) {
      setFormError('Vui lòng nhập ít nhất tên hãng tàu hoặc tên tàu!');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const url = editItem
        ? `${API_BASE}/admin/schedules/${editItem.scheduleId}`
        : `${API_BASE}/admin/schedules`;
      const method = editItem ? 'PUT' : 'POST';
      const body: Record<string, any> = {
        companyName: form.companyName || undefined,
        shipName: form.shipName || undefined,
        type: form.type || undefined,
        shipType: form.shipType || undefined,
        location: form.location || undefined,
        status: form.status || undefined,
      };
      if (form.timeStart) body.timeStart = form.timeStart;
      if (form.timeEnd) body.timeEnd = form.timeEnd;
      if (form.containers) body.containers = parseInt(form.containers, 10);

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi lưu dữ liệu');
      closeModal();
      fetchData();
    } catch (e: any) {
      setFormError(e.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Schedule) => {
    if (!window.confirm(`Xác nhận xóa lịch trình này?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/schedules/${item.scheduleId}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Lỗi xóa');
      }
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Lỗi xóa');
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý lịch trình"
        subtitle="Lịch tàu, lịch nhập/xuất container"
        action={<button type="button" className="btn btn-primary" onClick={openAdd}>+ Thêm lịch trình</button>}
      />

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <div style={{ color: 'var(--danger)' }}>{error}</div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Hãng tàu</th><th>Tên tàu</th><th>Loại tàu</th><th>Loại chuyến</th>
                  <th>Thời gian bắt đầu</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu.</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.scheduleId}>
                      <td><code>{row.scheduleId}</code></td>
                      <td>{row.companyName || '—'}</td>
                      <td>{row.shipName || '—'}</td>
                      <td>{row.shipType || '—'}</td>
                      <td>
                        <span className={`badge ${row.type === 'IMPORT' || row.type === 'import' ? 'badge-success' : 'badge-info'}`}>
                          {row.type || '—'}
                        </span>
                      </td>
                      <td>{row.timeStart ? new Date(row.timeStart).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                      <td>
                        <span className="badge badge-info">{row.status || '—'}</span>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>✏ Sửa</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(row)}>✕ Xóa</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="modal" style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <div className="modal-title">{editItem ? 'Sửa lịch trình' : 'Thêm lịch trình'}</div>
            <button type="button" className="modal-close" onClick={closeModal}>✕</button>
          </div>
          {formError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hãng tàu</label>
              <select className="form-input" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)}>
                <option value="">-- Chọn hãng tàu --</option>
                {companies.map((c) => (
                  <option key={c.companyId} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tên tàu</label>
              <input className="form-input" placeholder="VD: Maersk Seletar" value={form.shipName} onChange={(e) => setField('shipName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Loại chuyến</label>
              <select className="form-input" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="IMPORT">IMPORT (Nhập)</option>
                <option value="EXPORT">EXPORT (Xuất)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loại tàu</label>
              <input className="form-input" placeholder="VD: Container Ship" value={form.shipType} onChange={(e) => setField('shipType', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Thời gian bắt đầu</label>
              <input className="form-input" type="datetime-local" value={form.timeStart} onChange={(e) => setField('timeStart', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Thời gian kết thúc</label>
              <input className="form-input" type="datetime-local" value={form.timeEnd} onChange={(e) => setField('timeEnd', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Địa điểm</label>
              <input className="form-input" placeholder="VD: Cảng Cát Lái" value={form.location} onChange={(e) => setField('location', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Số container</label>
              <input className="form-input" type="number" min="0" placeholder="VD: 50" value={form.containers} onChange={(e) => setField('containers', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
