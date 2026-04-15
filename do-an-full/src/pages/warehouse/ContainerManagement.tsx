import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../components/warehouse/WarehouseLayout';
import {
  Package, Search, Filter,
  Download, MapPin, Calendar, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';

interface Container {
  containerId: string;
  containerTypeName?: string;
  statusName?: string;
  cargoTypeName?: string;
  attributeName?: string;
  grossWeight?: number;
  sealNumber?: string;
  note?: string;
  createdAt?: string;

  // position (enriched by backend when available)
  yardName?: string;
  yardType?: string;
  zoneName?: string;
  blockName?: string;
  rowNo?: number;
  bayNo?: number;
  tier?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Chờ xử lý',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  STORED:   { label: 'Đang lưu kho', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  EXPORTED: { label: 'Đã xuất',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DAMAGED:  { label: 'Kho hỏng',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function ContainerManagement() {
  const { accessToken, user } = useWarehouseAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const headers = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/containers?page=0&size=200&sortBy=createdAt&direction=desc`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy dữ liệu');
      setContainers(data.data?.content || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const filteredContainers = containers.filter((c) => {
    const matchSearch =
      (c.containerId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cargoTypeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.containerTypeName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || (c.statusName || '') === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleReportDamage = async (id: string, containerNumber: string) => {
    if (!confirm(`Đưa container ${containerNumber} vào kho hỏng?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${id}/damage`, { method: 'POST', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật container');
      await fetchContainers();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Mã Container', 'Loại', 'Hàng hóa', 'Trọng lượng', 'Vị trí', 'Trạng thái', 'Tạo lúc'],
      ...filteredContainers.map(c => [
        c.containerId,
        c.containerTypeName || '',
        c.cargoTypeName || '',
        c.grossWeight != null ? String(c.grossWeight) : '',
        c.blockName && c.rowNo != null && c.bayNo != null && c.tier != null
          ? `${c.zoneName || ''}-${c.blockName}-${c.rowNo}-${c.bayNo}-${c.tier}`
          : '',
        STATUS_MAP[c.statusName || '']?.label || (c.statusName || ''),
        c.createdAt || '',
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `containers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // TODO: CRUD containers in backend uses IDs for catalog lookups (containerTypeId/cargoTypeId/attributeId).
  // Keep this page read-only for now to avoid mismatch with legacy Supabase form.
  const canEdit = false;
  const canDelete = false;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Quản lý Container</h2>
            <p className="text-gray-600 dark:text-gray-400">Dữ liệu từ Backend (Spring Boot)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchContainers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng container', count: containers.length, color: 'bg-blue-500' },
              { label: 'Chờ xử lý', count: containers.filter(c => (c.statusName || '') === 'PENDING').length, color: 'bg-yellow-500' },
              { label: 'Đang lưu', count: containers.filter(c => (c.statusName || '') === 'STORED').length, color: 'bg-blue-600' },
              { label: 'Kho hỏng', count: containers.filter(c => (c.statusName || '') === 'DAMAGED').length, color: 'bg-red-500' },
              { label: 'Đã xuất', count: containers.filter(c => (c.statusName || '') === 'EXPORTED').length, color: 'bg-green-500' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${s.color} w-3 h-10 rounded-full`} />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Tìm kiếm mã container, khách hàng, hàng hóa..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="STORED">Đang lưu kho</SelectItem>
                  <SelectItem value="DAMAGED">Kho hỏng</SelectItem>
                  <SelectItem value="EXPORTED">Đã xuất</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Xuất CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Danh sách Container ({filteredContainers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" /> {error}
                <Button size="sm" variant="outline" onClick={fetchContainers} className="ml-auto">Thử lại</Button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Đang tải dữ liệu từ backend...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Container</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Hàng hóa</TableHead>
                      <TableHead>Trọng lượng</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Tạo lúc</TableHead>
                      {(canEdit || canDelete) && <TableHead className="text-right">Thao tác</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContainers.map((container, index) => (
                      <motion.tr key={container.containerId}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-mono font-bold text-blue-700 dark:text-blue-400">
                          {container.containerId}
                        </TableCell>
                        <TableCell><Badge variant="outline">{container.containerTypeName || '—'}</Badge></TableCell>
                        <TableCell className="text-sm">{container.cargoTypeName || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {container.grossWeight != null ? Number(container.grossWeight).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-mono">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {container.blockName && container.rowNo != null && container.bayNo != null && container.tier != null
                              ? `${container.zoneName || '—'}-${container.blockName}-${container.rowNo}-${container.bayNo}-${container.tier}`
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[container.statusName || '']?.color || ''}`}>
                            {STATUS_MAP[container.statusName || '']?.label || (container.statusName || '—')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {container.createdAt ? new Date(container.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && container.statusName !== 'DAMAGED' && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => handleReportDamage(container.containerId, container.containerId)}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title="Báo hỏng container"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(container)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => handleDelete(container.containerId, container.containerId)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
                      {filteredContainers.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                            {containers.length === 0 ? 'Chưa có container nào.' : 'Không tìm thấy container phù hợp'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
