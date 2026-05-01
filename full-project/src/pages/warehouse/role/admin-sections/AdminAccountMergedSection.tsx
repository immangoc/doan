import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, RotateCcw, Shield, KeyRound, FileText, Bell } from 'lucide-react';
import { toast } from 'sonner';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Switch } from '../../../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Textarea } from '../../../../components/ui/textarea';
import { Badge } from '../../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import ChatBox from '../../../../components/warehouse/ChatBox';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type Activity = {
  logId: number;
  userId?: number;
  username?: string;
  action: string;
  description: string;
  createdAt: string;
};

type Preferences = {
  language?: string;
  theme?: string;
  notifications?: Record<string, boolean>;
};

type Me = {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
};

function splitHoTen(fullName: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { ho: '', ten: parts[0] || '' };
  return { ho: parts.slice(0, -1).join(' '), ten: parts[parts.length - 1] || '' };
}

function loadPrefsFromStorage(): Preferences {
  try {
    const theme = localStorage.getItem('ht_ui_theme') || 'light';
    const language = localStorage.getItem('ht_ui_lang') || 'vi';
    const notifRaw = localStorage.getItem('ht_ui_notif');
    const notifications = notifRaw ? JSON.parse(notifRaw) : {};
    return { theme, language, notifications };
  } catch {
    return { theme: 'light', language: 'vi', notifications: {} };
  }
}

export default function AdminAccountMergedSection() {
  const { accessToken, user } = useWarehouseAuth();

  const apiUrl = API_BASE;
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [me, setMe] = useState<Me | null>(null);

  const [ho, setHo] = useState('');
  const [ten, setTen] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);

  // password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // preferences — loaded from localStorage, no backend endpoint
  const [prefs, setPrefs] = useState<Preferences>(loadPrefsFromStorage);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // activities
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  const [activityKeyword, setActivityKeyword] = useState('');

  const notificationKeys = useMemo(() => {
    const base = prefs.notifications || {};
    const keys = Object.keys(base);
    // đảm bảo có đủ một số mục cơ bản
    const fallback = ['new_orders', 'low_stock', 'weekly_report', 'system_alerts'];
    for (const k of fallback) if (!keys.includes(k)) keys.push(k);
    return keys;
  }, [prefs.notifications]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, actsRes] = await Promise.all([
        fetch(`${apiUrl}/users/me`, { headers }),
        fetch(`${apiUrl}/users/me/activity-log?page=0&size=50`, { headers }),
      ]);
      const meData = await meRes.json();
      const actsData = await actsRes.json();
      if (!meRes.ok) throw new Error(meData.message || 'Lỗi lấy thông tin cá nhân');
      if (!actsRes.ok) throw new Error(actsData.message || 'Lỗi lấy nhật ký hoạt động');

      const meUser = meData.data as Me;
      setMe(meUser);
      const { ho: _ho, ten: _ten } = splitHoTen(meUser.fullName || meUser.username || '');
      setHo(_ho);
      setTen(_ten);
      setPhone(meUser.phone || '');
      // company and address are not stored in backend; keep existing UI values
      setActivities(actsData.data?.content || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const refreshActivities = async () => {
    setActivitiesLoading(true);
    setActivitiesError('');
    try {
      const res = await fetch(`${apiUrl}/users/me/activity-log?page=0&size=50`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy nhật ký hoạt động');
      setActivities(data.data?.content || []);
    } catch (e: any) {
      setActivitiesError(e.message || 'Lỗi không xác định');
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Áp dụng theme & ngôn ngữ ngay khi user bấm "Lưu" ở trang này.
  useEffect(() => {
    const theme = prefs.theme || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('ht_ui_theme', theme);
    } catch {
      // ignore
    }
  }, [prefs.theme]);

  useEffect(() => {
    const language = prefs.language || 'vi';
    try {
      localStorage.setItem('ht_ui_lang', language);
    } catch {
      // ignore
    }
  }, [prefs.language]);

  const filteredActivities = useMemo(() => {
    const k = activityKeyword.trim().toLowerCase();
    if (!k) return activities;
    return activities.filter((a) => `${a.username ?? ''} ${a.description} ${a.action}`.toLowerCase().includes(k));
  }, [activities, activityKeyword]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setError('');
    try {
      const fullName = `${ho} ${ten}`.trim().replace(/\s+/g, ' ');
      if (!fullName) throw new Error('Họ và tên không được để trống');
      const res = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT', headers,
        body: JSON.stringify({ fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật thông tin');
      await fetchAll();
      toast.success('Cập nhật thông tin thành công');
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setChangingPwd(true);
    try {
      if (!currentPassword || !newPassword || !confirmPassword) throw new Error('Vui lòng nhập đầy đủ mật khẩu');
      if (newPassword !== confirmPassword) throw new Error('Xác nhận mật khẩu không khớp');
      if (newPassword.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
      const res = await fetch(`${apiUrl}/auth/change-password`, {
        method: 'PUT', headers,
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đổi mật khẩu');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Đổi mật khẩu thành công');
    } catch (e: any) {
      toast.error(e.message || 'Lỗi không xác định');
    } finally {
      setChangingPwd(false);
    }
  };

  const savePrefs = () => {
    setSavingPrefs(true);
    try {
      localStorage.setItem('ht_ui_theme', prefs.theme || 'light');
      localStorage.setItem('ht_ui_lang', prefs.language || 'vi');
      localStorage.setItem('ht_ui_notif', JSON.stringify(prefs.notifications || {}));
      toast.success('Cập nhật tuỳ chọn hiển thị & thông báo thành công');
    } catch {
      // ignore storage errors
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý tài khoản & cấu hình</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gộp xác thực, nhật ký hoạt động và cấu hình hiển thị. Giao diện tối ưu theo ảnh tham chiếu.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Thông tin cá nhân
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">Email (không chỉnh sửa) và các trường profile.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Họ</div>
                  <Input value={ho} onChange={(e) => setHo(e.target.value)} placeholder="VD: Nguyễn" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Tên</div>
                  <Input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="VD: Văn A" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Email</div>
                <Input value={me?.email ?? user?.email ?? ''} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Công ty</div>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Cty TNHH..." />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Địa chỉ</div>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: 123 Đường..., Quận..., TP.HCM"
                  className="min-h-[90px]"
                />
              </div>

              <div className="pt-2">
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-blue-900 hover:bg-blue-800 text-white w-full">
                  {savingProfile ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Bảo mật
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">Quản lý mật khẩu và bảo vệ đăng nhập.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</div>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Mật khẩu mới</div>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</div>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
              </div>
              <Button onClick={changePassword} disabled={changingPwd} className="bg-red-600 hover:bg-red-700 text-white w-full">
                <KeyRound className="w-4 h-4 mr-2" />
                {changingPwd ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </Button>
              <div className="text-xs text-gray-500">
                Tip: phần này gọi endpoint `auth/change-password` trong Edge Function.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Thông báo
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">Bật/tắt các mục thông báo mà bạn muốn nhận.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationKeys.map((k) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">
                    {k === 'new_orders' ? 'Đơn hàng mới' : k === 'low_stock' ? 'Cảnh báo tồn kho' : k === 'weekly_report' ? 'Báo cáo hàng tuần' : k === 'system_alerts' ? 'Cảnh báo hệ thống' : k}
                  </div>
                  <Switch
                    checked={Boolean(prefs.notifications?.[k])}
                    onCheckedChange={(checked) =>
                      setPrefs((prev) => ({
                        ...prev,
                        notifications: {
                          ...(prev.notifications || {}),
                          [k]: Boolean(checked),
                        },
                      }))
                    }
                  />
                </div>
              ))}

              <Button onClick={savePrefs} disabled={savingPrefs} className="bg-blue-900 hover:bg-blue-800 text-white w-full">
                {savingPrefs ? 'Đang lưu...' : 'Lưu tuỳ chọn thông báo'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                Tùy chọn hiển thị
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">Chuyển đổi giao diện và ngôn ngữ.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Ngôn ngữ</div>
                <Select value={prefs.language || 'vi'} onValueChange={(v) => setPrefs((p) => ({ ...p, language: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Giao diện</div>
                <Select value={prefs.theme || 'light'} onValueChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Sáng</SelectItem>
                    <SelectItem value="dark">Tối</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-gray-500">
                Hiện tại UI theme đổi thực tế sẽ được triển khai ở bước sau (đang lưu cấu hình).
              </div>
              <Button onClick={savePrefs} disabled={savingPrefs} className="bg-blue-900 hover:bg-blue-800 text-white w-full">
                {savingPrefs ? 'Đang lưu...' : 'Lưu giao diện & ngôn ngữ'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Nhật ký hoạt động
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">Theo dõi các thao tác gần đây trong hệ thống.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Input value={activityKeyword} onChange={(e) => setActivityKeyword(e.target.value)} placeholder="Tìm theo mô tả..." />
                <Button variant="outline" onClick={refreshActivities} disabled={activitiesLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${activitiesLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
              </div>

              {activitiesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {activitiesError}
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.slice(0, 8).map((a) => (
                      <TableRow key={a.logId}>
                        <TableCell>
                          <Badge variant="outline">{a.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-gray-600">
                          {a.username || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{a.description}</TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredActivities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-10">
                          Không có dữ liệu phù hợp
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Chat hỗ trợ (Chatbox)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ChatBox />
              <div className="h-[520px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}


