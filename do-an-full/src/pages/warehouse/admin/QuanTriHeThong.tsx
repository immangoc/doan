import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type UserItem = {
  userId: number;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: number;
  createdAt?: string;
  roles?: { roleId?: number; roleName?: string }[];
};

type UserForm = {
  username: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  roleName: string;
};

const EMPTY_FORM: UserForm = {
  username: '', fullName: '', email: '', password: '', phone: '', roleName: 'CUSTOMER',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', PLANNER: 'Điều phối', OPERATOR: 'Nhân viên kho', CUSTOMER: 'Khách hàng',
};

const getRoleDisplay = (user: UserItem): string => {
  if (!user.roles || user.roles.length === 0) return '—';
  return user.roles.map((r) => ROLE_LABEL[r.roleName || ''] || r.roleName || '?').join(', ');
};

export default function QuanTriHeThong() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [detailUser, setDetailUser] = useState<UserItem | null>(null);

  const fetchData = async (pg = 0) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users?page=${pg}&size=20&sortBy=createdAt&sortDir=desc`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải danh sách người dùng');
      const pageData = d.data;
      setUsers(pageData.content || []);
      setTotal(pageData.totalElements ?? 0);
      setTotalPages(pageData.totalPages ?? 0);
      setPage(pg);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(0); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (user: UserItem) => {
    setEditItem(user);
    setForm({
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      roleName: user.roles?.[0]?.roleName || 'CUSTOMER',
    });
    setFormError('');
    setOpen(true);
  };

  const closeModal = () => { setOpen(false); setEditItem(null); setFormError(''); };

  const setField = (key: keyof UserForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.email.trim()) { setFormError('Vui lòng nhập email!'); return; }
    if (!editItem && !form.password.trim()) { setFormError('Vui lòng nhập mật khẩu!'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editItem) {
        const body: Record<string, string> = {};
        if (form.fullName) body.fullName = form.fullName;
        if (form.email) body.email = form.email;
        if (form.phone) body.phone = form.phone;
        if (form.roleName) body.roleName = form.roleName;
        const res = await fetch(`${API_BASE}/admin/users/${editItem.userId}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.message || 'Lỗi cập nhật');
      } else {
        const body: Record<string, string> = {
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          roleName: form.roleName,
        };
        if (form.phone) body.phone = form.phone;
        const res = await fetch(`${API_BASE}/admin/users`, {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.message || 'Lỗi tạo người dùng');
      }
      closeModal();
      fetchData(page);
    } catch (e: any) {
      setFormError(e.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    const newStatus = user.status === 1 ? 0 : 1;
    const label = newStatus === 0 ? 'khóa' : 'kích hoạt';
    if (!window.confirm(`Xác nhận ${label} tài khoản "${user.username || user.email}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.userId}/status?status=${newStatus}`, {
        method: 'PUT', headers,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Lỗi cập nhật trạng thái');
      }
      fetchData(page);
    } catch (e: any) {
      setError(e.message || 'Lỗi cập nhật trạng thái');
    }
  };

  return (
    <>
      <PageHeader
        title="Quản trị hệ thống"
        subtitle={`Quản lý tài khoản người dùng (${total} tài khoản)`}
        action={<button type="button" className="btn btn-primary" onClick={openAdd}>+ Thêm tài khoản</button>}
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
                  <th>ID</th><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th>
                  <th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.userId}>
                      <td><code>{user.userId}</code></td>
                      <td>{user.username || '—'}</td>
                      <td>{user.fullName || '—'}</td>
                      <td>{user.email || '—'}</td>
                      <td>{getRoleDisplay(user)}</td>
                      <td>
                        <span className={`badge ${user.status === 1 ? 'badge-success' : 'badge-danger'}`}>
                          {user.status === 1 ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailUser(user)}>✏ Xem</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}>✏ Sửa</button>
                        <button
                          type="button"
                          className={`btn btn-sm ${user.status === 1 ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 1 ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 0', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => fetchData(page - 1)}>←</button>
            <span style={{ lineHeight: '28px', fontSize: 13 }}>{page + 1} / {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => fetchData(page + 1)}>→</button>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <div className={`modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="modal" style={{ maxWidth: 520 }}>
          <div className="modal-header">
            <div className="modal-title">{editItem ? 'Sửa tài khoản' : 'Thêm tài khoản'}</div>
            <button type="button" className="modal-close" onClick={closeModal}>✕</button>
          </div>
          {formError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{formError}</div>}
          <div className="form-row">
            {!editItem && (
              <div className="form-group">
                <label className="form-label">Tên đăng nhập *</label>
                <input className="form-input" placeholder="VD: john.doe" value={form.username} onChange={(e) => setField('username', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" placeholder="VD: Nguyễn Văn A" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="VD: user@example.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            {!editItem && (
              <div className="form-group">
                <label className="form-label">Mật khẩu *</label>
                <input className="form-input" type="password" placeholder="Mật khẩu ban đầu" value={form.password} onChange={(e) => setField('password', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Điện thoại</label>
              <input className="form-input" placeholder="VD: 0901234567" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <select className="form-input" value={form.roleName} onChange={(e) => setField('roleName', e.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="PLANNER">Điều phối</option>
                <option value="OPERATOR">Nhân viên kho</option>
                <option value="CUSTOMER">Khách hàng</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo tài khoản'}
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detailUser && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setDetailUser(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">Chi tiết tài khoản</div>
              <button type="button" className="modal-close" onClick={() => setDetailUser(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 16 }}>
              <div><div style={{ color: 'var(--text2)' }}>ID</div><div style={{ fontWeight: 500 }}>{detailUser.userId}</div></div>
              <div><div style={{ color: 'var(--text2)' }}>Tên đăng nhập</div><div style={{ fontWeight: 500 }}>{detailUser.username || '—'}</div></div>
              <div><div style={{ color: 'var(--text2)' }}>Họ tên</div><div style={{ fontWeight: 500 }}>{detailUser.fullName || '—'}</div></div>
              <div><div style={{ color: 'var(--text2)' }}>Email</div><div style={{ fontWeight: 500 }}>{detailUser.email || '—'}</div></div>
              <div><div style={{ color: 'var(--text2)' }}>Điện thoại</div><div style={{ fontWeight: 500 }}>{detailUser.phone || '—'}</div></div>
              <div><div style={{ color: 'var(--text2)' }}>Vai trò</div><div style={{ fontWeight: 500 }}>{getRoleDisplay(detailUser)}</div></div>
              <div>
                <div style={{ color: 'var(--text2)' }}>Trạng thái</div>
                <span className={`badge ${detailUser.status === 1 ? 'badge-success' : 'badge-danger'}`}>
                  {detailUser.status === 1 ? 'Hoạt động' : 'Bị khóa'}
                </span>
              </div>
              <div>
                <div style={{ color: 'var(--text2)' }}>Ngày tạo</div>
                <div style={{ fontWeight: 500 }}>{detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleString('vi-VN') : '—'}</div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDetailUser(null)}>Đóng</button>
              <button type="button" className="btn btn-primary" onClick={() => { setDetailUser(null); openEdit(detailUser); }}>✏ Sửa</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
