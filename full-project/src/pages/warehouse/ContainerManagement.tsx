import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../components/warehouse/WarehouseLayout';
import {
  Package, Plus, Edit, Trash2, Search, Filter,
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
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Container {
  id: string;
  container_number: string;
  customer_name: string;
  container_type: string;
  cargo_type: string;
  weight_kg: number;
  position: string;
  status: 'pending' | 'in_storage' | 'exported';
  eta: string;
  etd: string;
  zone: string;
  block: string;
  slot: string;
  notes?: string;
  created_at?: string;
}

const EMPTY_FORM = {
  container_number: '', customer_name: '', container_type: '20ft',
  cargo_type: '', weight_kg: '', zone: 'A', block: '01', slot: '001',
  status: 'pending', eta: '', etd: '', notes: '',
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Chờ xử lý',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_storage: { label: 'Đang lưu kho', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  exported:   { label: 'Đã xuất',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function ContainerManagement() {
  const { accessToken, user } = useWarehouseAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ce1eb60c`;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken || publicAnonKey}` };

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/containers`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lấy dữ liệu');
      setContainers(data.containers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const filteredContainers = containers.filter((c) => {
    const matchSearch =
      c.container_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...formData,
        weight_kg: parseFloat(formData.weight_kg) || 0,
      };
      let res: Response;
      if (editingContainer) {
        res = await fetch(`${apiUrl}/containers/${editingContainer.id}`, {
          method: 'PUT', headers, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${apiUrl}/containers`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu container');
      await fetchContainers();
      setIsDialogOpen(false);
      setEditingContainer(null);
      setFormData({ ...EMPTY_FORM });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (container: Container) => {
    setEditingContainer(container);
    setFormData({
      container_number: container.container_number,
      customer_name: container.customer_name,
      container_type: container.container_type,
      cargo_type: container.cargo_type,
      weight_kg: container.weight_kg.toString(),
      zone: container.zone || 'A',
      block: container.block || '01',
      slot: container.slot || '001',
      status: container.status,
      eta: container.eta || '',
      etd: container.etd || '',
      notes: container.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, containerNumber: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa container ${containerNumber}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/containers/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa container');
      setContainers(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Mã Container', 'Khách hàng', 'Loại', 'Hàng hóa', 'Trọng lượng (kg)', 'Vị trí', 'Trạng thái', 'ETA', 'ETD'],
      ...filteredContainers.map(c => [
        c.container_number, c.customer_name, c.container_type, c.cargo_type,
        c.weight_kg, c.position, STATUS_MAP[c.status]?.label || c.status, c.eta, c.etd,
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `containers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const canEdit = user?.role === 'admin' || user?.role === 'planner';
  const canDelete = user?.role === 'admin';

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Quản lý Container</h2>
            <p className="text-gray-600 dark:text-gray-400">Dữ liệu thời gian thực từ Supabase</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchContainers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            {canEdit && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) { setEditingContainer(null); setFormData({ ...EMPTY_FORM }); setFormError(''); }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Thêm Container
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingContainer ? 'Chỉnh sửa Container' : 'Thêm Container mới'}</DialogTitle>
                    <DialogDescription>
                      {editingContainer ? 'Cập nhật thông tin container' : 'Nhập thông tin để thêm container vào kho bãi'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mã Container *</Label>
                        <Input value={formData.container_number}
                          onChange={e => setFormData({ ...formData, container_number: e.target.value.toUpperCase() })}
                          placeholder="TEMU1234567" required disabled={!!editingContainer} />
                      </div>
                      <div className="space-y-2">
                        <Label>Loại Container *</Label>
                        <Select value={formData.container_type} onValueChange={v => setFormData({ ...formData, container_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20ft">20ft</SelectItem>
                            <SelectItem value="40ft">40ft</SelectItem>
                            <SelectItem value="40ft-hc">40ft High Cube</SelectItem>
                            <SelectItem value="45ft">45ft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tên Khách hàng *</Label>
                      <Input value={formData.customer_name}
                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                        placeholder="Công ty TNHH..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Loại hàng hóa *</Label>
                        <Input value={formData.cargo_type}
                          onChange={e => setFormData({ ...formData, cargo_type: e.target.value })}
                          placeholder="Điện tử, Dệt may..." required />
                      </div>
                      <div className="space-y-2">
                        <Label>Trọng lượng (kg) *</Label>
                        <Input type="number" value={formData.weight_kg}
                          onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                          placeholder="24000" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Khu vực *</Label>
                        <Select value={formData.zone} onValueChange={v => setFormData({ ...formData, zone: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['A','B','C','D'].map(z => <SelectItem key={z} value={z}>Zone {z}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Block *</Label>
                        <Input value={formData.block} onChange={e => setFormData({ ...formData, block: e.target.value })} placeholder="01" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Slot *</Label>
                        <Input value={formData.slot} onChange={e => setFormData({ ...formData, slot: e.target.value })} placeholder="001" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Trạng thái *</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Chờ xử lý</SelectItem>
                            <SelectItem value="in_storage">Đang lưu kho</SelectItem>
                            <SelectItem value="exported">Đã xuất</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ETA *</Label>
                        <Input type="date" value={formData.eta} onChange={e => setFormData({ ...formData, eta: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>ETD *</Label>
                        <Input type="date" value={formData.etd} onChange={e => setFormData({ ...formData, etd: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ghi chú</Label>
                      <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                      <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={submitting}>
                        {submitting ? 'Đang lưu...' : editingContainer ? 'Cập nhật' : 'Thêm mới'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng container', count: containers.length, color: 'bg-blue-500' },
            { label: 'Chờ xử lý', count: containers.filter(c => c.status === 'pending').length, color: 'bg-yellow-500' },
            { label: 'Đang lưu kho', count: containers.filter(c => c.status === 'in_storage').length, color: 'bg-blue-600' },
            { label: 'Đã xuất', count: containers.filter(c => c.status === 'exported').length, color: 'bg-green-500' },
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
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="in_storage">Đang lưu kho</SelectItem>
                  <SelectItem value="exported">Đã xuất</SelectItem>
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
                <span className="ml-3 text-gray-600">Đang tải dữ liệu từ Supabase...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Container</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Hàng hóa</TableHead>
                      <TableHead>Trọng lượng</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>ETD</TableHead>
                      {(canEdit || canDelete) && <TableHead className="text-right">Thao tác</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContainers.map((container, index) => (
                      <motion.tr key={container.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-mono font-bold text-blue-700 dark:text-blue-400">
                          {container.container_number}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{container.customer_name}</TableCell>
                        <TableCell><Badge variant="outline">{container.container_type}</Badge></TableCell>
                        <TableCell className="text-sm">{container.cargo_type}</TableCell>
                        <TableCell className="text-sm">{Number(container.weight_kg).toLocaleString()} kg</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-mono">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {container.position || `${container.zone}-${container.block}-${container.slot}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[container.status]?.color || ''}`}>
                            {STATUS_MAP[container.status]?.label || container.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {container.etd ? new Date(container.etd).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && (
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(container)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => handleDelete(container.id, container.container_number)}
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
                      {containers.length === 0 ? 'Chưa có container nào. Hãy nhấn "Khởi tạo demo" ở trang đăng nhập.' : 'Không tìm thấy container phù hợp'}
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
