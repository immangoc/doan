import { useEffect, useState } from 'react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

export default function AdminAuthSection() {
  const { user, accessToken } = useWarehouseAuth();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [me, setMe] = useState<any | null>(null);

  const apiUrl = API_BASE;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const fetchMe = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${apiUrl}/users/me`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy thông tin xác thực');
      setMe(data.data);
    } catch (e: any) {
      setApiError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Xác thực</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Kiểm tra session đăng nhập & dữ liệu auth hiện tại.</p>
        </div>

        {apiError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{apiError}</span>
            <Button size="sm" variant="outline" onClick={fetchMe} disabled={loading}>
              Thử lại
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Thông tin từ context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Người dùng</div>
              <div className="text-gray-900 dark:text-white font-semibold">{user?.name || '—'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
              <div className="text-gray-900 dark:text-white font-semibold">{user?.email || '—'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Vai trò</div>
              <div className="text-gray-900 dark:text-white font-semibold">{user?.role || '—'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Công ty</div>
              <div className="text-gray-900 dark:text-white font-semibold">{user?.company || '—'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Kết quả gọi API `users/me`
              </CardTitle>
              <div className="mt-2">
                <Button variant="outline" onClick={fetchMe} disabled={loading}>
                  {loading ? 'Đang tải...' : 'Làm mới'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !me ? (
                <div className="text-gray-600 dark:text-gray-400">Đang tải...</div>
              ) : (
                <pre className="text-xs bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md p-3 overflow-auto">
                  {me ? JSON.stringify(me, null, 2) : 'Chưa có dữ liệu'}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WarehouseLayout>
  );
}

