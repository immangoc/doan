import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/warehouse/PageHeader';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

export default function QuanLyTaiKhoan() {
  const { user, accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_BASE}/users/me`, { headers });
        const d = await res.json();
        if (res.ok && d.data) {
          setFullName(d.data.fullName || d.data.name || '');
          setEmail(d.data.email || '');
          setPhone(d.data.phone || '');
        }
      } catch {
        // fallback to auth context values
        setFullName(user?.name || '');
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ fullName, email, phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi cập nhật');
      setProfileMsg('Đã cập nhật thông tin thành công.');
    } catch (e: any) {
      setProfileMsg(e.message || 'Lỗi cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMsg('Vui lòng nhập đầy đủ thông tin mật khẩu.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg('Mật khẩu mới và xác nhận không khớp.');
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi đổi mật khẩu');
      setPwMsg('Đổi mật khẩu thành công.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPwMsg(e.message || 'Lỗi đổi mật khẩu');
    } finally {
      setSavingPw(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : (user?.name?.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || 'AD');

  return (
    <>
      <PageHeader
        title="Tài khoản của tôi"
        subtitle="Quản lý thông tin cá nhân và bảo mật"
      />

      <div className="two-col">
        {/* Profile info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Thông tin cá nhân</div>
          </div>
          {loadingProfile ? (
            <div style={{ color: 'var(--text2)', padding: '16px 0' }}>Đang tải thông tin...</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{fullName || '—'}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13 }}>{user?.role || 'ADMIN'}</div>
                </div>
              </div>

              {profileMsg && (
                <div style={{ marginBottom: 12, fontSize: 13, color: profileMsg.toLowerCase().includes('lỗi') ? 'var(--danger)' : 'var(--success, #16a34a)' }}>
                  {profileMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Điện thoại</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Change password */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Đổi mật khẩu</div>
          </div>

          {pwMsg && (
            <div style={{ marginBottom: 12, fontSize: 13, color: pwMsg.toLowerCase().includes('lỗi') || pwMsg.toLowerCase().includes('khớp') || pwMsg.toLowerCase().includes('đủ') ? 'var(--danger)' : 'var(--success, #16a34a)' }}>
              {pwMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Mật khẩu hiện tại</label>
            <input className="form-input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu mới</label>
            <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu mới</label>
            <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleChangePassword} disabled={savingPw}>
              {savingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
