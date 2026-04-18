import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type ShippingCompany = {
  companyId: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  code?: string;
  country?: string;
  createdAt?: string;
};

export default function QuanLyHangTau() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [data, setData] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShippingCompany | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', code: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/shipping-companies`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải dữ liệu');
      setData(d.data || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', phone: '', email: '', address: '', code: '', country: '' });
    setFormError('');
    setOpen(true);
  };

  const openEdit = (item: ShippingCompany) => {
    setEditItem(item);
    setForm({ name: item.name, phone: item.phone || '', email: item.email || '', address: item.address || '', code: item.code || '', country: item.country || '' });
    setFormError('');
    setOpen(true);
  };

  const closeModal = () => { setOpen(false); setEditItem(null); setFormError(''); };

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Vui lòng nhập tên hãng tàu!'); return; }
    setSaving(true);
    setFormError('');
    try {
      const url = editItem
        ? `${API_BASE}/admin/shipping-companies/${editItem.companyId}`
        : `${API_BASE}/admin/shipping-companies`;
      const method = editItem ? 'PUT' : 'POST';
      const body: Record<string, string> = { name: form.name.trim() };
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.address) body.address = form.address;
      if (form.code) body.code = form.code;
      if (form.country) body.country = form.country;
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

  const handleDelete = async (item: ShippingCompany) => {
    if (!window.confirm(`Xác nhận xóa hãng tàu "${item.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/shipping-companies/${item.companyId}`, { method: 'DELETE', headers });
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
        title="Quản lý hãng tàu"
        subtitle="Danh sách hãng tàu hợp tác"
        action={<button type="button" className="btn btn-primary" onClick={openAdd}>+ Thêm hãng tàu</button>}
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
                <tr><th>ID</th><th>Tên hãng tàu</th><th>Mã</th><th>Quốc gia</th><th>Điện thoại</th><th>Email</th><th>Ngày tạo</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu.</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.companyId}>
                      <td><code>{row.companyId}</code></td>
                      <td>{row.name}</td>
                      <td>{row.code || '—'}</td>
                      <td>{row.country || '—'}</td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.email || '—'}</td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
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
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{editItem ? 'Sửa hãng tàu' : 'Thêm hãng tàu'}</div>
            <button type="button" className="modal-close" onClick={closeModal}>✕</button>
          </div>
          {formError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{formError}</div>}
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Tên hãng tàu *</label>
              <input className="form-input" placeholder="VD: Maersk Line" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mã hãng tàu</label>
              <input className="form-input" placeholder="VD: MSK" value={form.code} onChange={(e) => setField('code', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Quốc gia</label>
              <input className="form-input" placeholder="VD: Denmark" value={form.country} onChange={(e) => setField('country', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Điện thoại</label>
              <input className="form-input" placeholder="VD: +84 28 1234 5678" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="VD: info@maersk.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Địa chỉ</label>
              <input className="form-input" placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM" value={form.address} onChange={(e) => setField('address', e.target.value)} />
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
