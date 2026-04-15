import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

const STORAGE_KEY = 'ht_permissions';

function loadPermsFromStorage(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function AdminPermissionsSection({ showLayout = true }: { showLayout?: boolean }) {
  const { accessToken } = useWarehouseAuth();
  const apiUrl = API_BASE;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<Record<string, string[]>>({});

  const [newPerm, setNewPerm] = useState<Record<string, string>>({});

  const fetchPerms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/admin/roles`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách vai trò');
      const roleList: { roleId: number; roleName: string }[] = data.data || [];
      const saved = loadPermsFromStorage();
      const initial: Record<string, string[]> = {};
      for (const r of roleList) {
        initial[r.roleName] = saved[r.roleName] || [];
      }
      setRoles(initial);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
      alert('Cập nhật phân quyền thành công (lưu cục bộ)');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const rolesSorted = useMemo(() => {
    const keys = Object.keys(roles || {});
    keys.sort((a, b) => DEFAULT_ROLES.indexOf(a) - DEFAULT_ROLES.indexOf(b));
    return keys;
  }, [roles]);

  const addPerm = (role: string) => {
    const value = (newPerm[role] || '').trim();
    if (!value) return;
    setRoles((prev) => {
      const next = { ...prev };
      const arr = next[role] || [];
      if (!arr.includes(value)) next[role] = [...arr, value];
      return next;
    });
    setNewPerm((p) => ({ ...p, [role]: '' }));
  };

  const removePerm = (role: string, perm: string) => {
    setRoles((prev) => ({
      ...prev,
      [role]: (prev[role] || []).filter((p) => p !== perm),
    }));
  };

  const content = (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý phân quyền</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Chỉnh danh sách permission gán cho từng vai trò (UI quản trị).</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={fetchPerms} disabled={loading}>
              Thử lại
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-600" />
              Cấu hình permission
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Button variant="outline" onClick={fetchPerms} disabled={loading}>
                Làm mới
              </Button>
              <Button onClick={save} className="bg-blue-900 hover:bg-blue-800 text-white" disabled={saving || loading}>
                {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {rolesSorted.map((role) => (
              <div key={role} className="space-y-3">
                <div className="font-semibold text-gray-900 dark:text-white text-lg">{role}</div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-medium text-gray-700">Permission mới</div>
                    <Input
                      placeholder="VD: containers:view hoặc *"
                      value={newPerm[role] || ''}
                      onChange={(e) => setNewPerm((p) => ({ ...p, [role]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addPerm(role);
                      }}
                    />
                  </div>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => addPerm(role)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Danh sách permission</TableHead>
                      <TableHead className="text-right">Xóa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(roles[role] || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500 py-10">
                          Chưa có permission
                        </TableCell>
                      </TableRow>
                    ) : (
                      (roles[role] || []).map((perm) => (
                        <TableRow key={perm}>
                          <TableCell className="font-mono">{perm}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-700 hover:text-red-800 hover:bg-red-50"
                              onClick={() => removePerm(role, perm)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
    </div>
  );

  return showLayout ? <WarehouseLayout>{content}</WarehouseLayout> : content;
}

