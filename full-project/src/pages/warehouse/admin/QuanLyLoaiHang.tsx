import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type CargoType = { cargoTypeId: number; cargoTypeName: string };

export default function QuanLyLoaiHang() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [data, setData] = useState<CargoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<CargoType | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState<CargoType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/cargo-types`, { headers });
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

  const openAdd = () => { setEditItem(null); setName(''); setFormError(''); setOpen(true); };
  const openEdit = (item: CargoType) => { setEditItem(item); setName(item.cargoTypeName); setFormError(''); setOpen(true); };
  const closeModal = () => { setOpen(false); setEditItem(null); setName(''); setFormError(''); };

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Vui lòng nhập tên loại hàng!'); return; }
    setSaving(true);
    setFormError('');
    try {
      const url = editItem
        ? `${API_BASE}/admin/cargo-types/${editItem.cargoTypeId}`
        : `${API_BASE}/admin/cargo-types`;
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify({ cargoTypeName: name.trim() }) });
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

  const openDeleteModal = (item: CargoType) => {
    setDeleteItem(item);
    setOpenDelete(true);
  };

  const closeDeleteModal = () => {
    setOpenDelete(false);
    setDeleteItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/cargo-types/${deleteItem.cargoTypeId}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Lỗi xóa');
      }
      closeDeleteModal();
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Lỗi xóa');
      closeDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý loại hàng"
        subtitle="Danh sách phân loại hàng hóa"
        action={<button type="button" className="btn btn-primary" onClick={openAdd}>+ Thêm loại hàng</button>}
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
                <tr><th>ID</th><th>Tên loại hàng</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={3} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu.</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.cargoTypeId}>
                      <td><code>{row.cargoTypeId}</code></td>
                      <td>{row.cargoTypeName}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>✏ Sửa</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => openDeleteModal(row)}>✕ Xóa</button>
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
            <div className="modal-title">{editItem ? 'Sửa loại hàng' : 'Thêm loại hàng'}</div>
            <button type="button" className="modal-close" onClick={closeModal}>✕</button>
          </div>
          {formError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{formError}</div>}
          <div className="form-group">
            <label className="form-label">Tên loại hàng</label>
            <input
              className="form-input"
              placeholder="VD: Hàng Lạnh"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay${openDelete ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}>
        <div className="modal" style={{ maxWidth: 400 }}>
          <div className="modal-header">
            <div className="modal-title">Xác nhận xóa</div>
            <button type="button" className="modal-close" onClick={closeDeleteModal}>✕</button>
          </div>
          <div style={{ padding: '0 24px 24px', color: 'var(--text2)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa loại hàng <b>{deleteItem?.cargoTypeName}</b> không? Thao tác này không thể hoàn tác.
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>Hủy</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
