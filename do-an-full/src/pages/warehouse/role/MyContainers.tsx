import { useEffect, useMemo, useState } from 'react';
import { Container, AlertCircle, RefreshCw, Search, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

type ContainerItem = {
  containerId: string;
  manifestId?: number;
  containerTypeName?: string;
  statusName?: string;
  cargoTypeName?: string;
  attributeName?: string;
  grossWeight?: number;
  sealNumber?: string;
  note?: string;
  createdAt?: string;
};

type LookupItem = { id: number; name: string };

const PAGE_SIZE = 20;

export default function MyContainers() {
  const { accessToken, user } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery]           = useState('');

  // ── Catalog data for the create form ───────────────────────────────────────
  const [containerTypes, setContainerTypes] = useState<LookupItem[]>([]);
  const [cargoTypes, setCargoTypes]         = useState<LookupItem[]>([]);

  // ── Create modal state ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    containerId:     '',
    containerTypeId: 0,
    cargoTypeId:     0,
    grossWeight:     '',
    note:            '',
  });
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchContainers = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        size: String(PAGE_SIZE),
        sortBy: 'containerId',
        direction: 'asc',
      });
      const res  = await fetch(`${API_BASE}/admin/containers/my?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách container');
      setContainers(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const [ctRes, carRes] = await Promise.all([
        fetch(`${API_BASE}/admin/container-types`, { headers }),
        fetch(`${API_BASE}/admin/cargo-types`,     { headers }),
      ]);
      const ctData  = await ctRes.json();
      const carData = await carRes.json();
      const ctList  = ctData.data  ?? [];
      const carList = carData.data ?? [];
      setContainerTypes(
        ctList.map((t: any) => ({ id: t.containerTypeId ?? t.id, name: t.containerTypeName ?? t.name })),
      );
      setCargoTypes(
        carList.map((t: any) => ({ id: t.cargoTypeId ?? t.id, name: t.cargoTypeName ?? t.name })),
      );
      // Pre-select first option
      if (ctList.length > 0)  setCreateForm((f) => ({ ...f, containerTypeId: ctList[0].containerTypeId ?? ctList[0].id }));
      if (carList.length > 0) setCreateForm((f) => ({ ...f, cargoTypeId:     carList[0].cargoTypeId     ?? carList[0].id }));
    } catch {
      // Silently fail — user can still type IDs manually if needed
    }
  };

  useEffect(() => {
    fetchContainers(0);
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = query.trim().toLowerCase();
    if (!k) return containers;
    return containers.filter((c) =>
      `${c.containerId} ${c.containerTypeName ?? ''} ${c.statusName ?? ''} ${c.cargoTypeName ?? ''}`.toLowerCase().includes(k),
    );
  }, [containers, query]);

  const statusBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const s = status.toLowerCase();
    if (s.includes('out') || s.includes('xuất')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s.includes('in') || s.includes('nhập') || s.includes('kho')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (s.includes('pending') || s.includes('chờ') || s.includes('available')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.containerId.trim()) {
      setCreateError('Vui lòng nhập mã container');
      return;
    }
    if (!createForm.containerTypeId || !createForm.cargoTypeId) {
      setCreateError('Vui lòng chọn loại container và loại hàng');
      return;
    }
    setCreating(true);
    try {
      // Step 1: create container
      const containerRes = await fetch(`${API_BASE}/admin/containers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          containerId:     createForm.containerId.trim(),
          containerTypeId: createForm.containerTypeId,
          cargoTypeId:     createForm.cargoTypeId,
          grossWeight:     parseFloat(createForm.grossWeight) || 0,
          note:            createForm.note.trim() || undefined,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerRes.ok) throw new Error(containerData.message || 'Tạo container thất bại');

      // Step 2: create an order linking this container so it appears in the waiting list after approval
      const customerName = user?.name || 'Khách hàng';
      const orderRes = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          phone:        user?.phone  || '',
          email:        user?.email  || '',
          note:         `Đặt lưu kho container ${createForm.containerId.trim()}`,
          containerIds: [createForm.containerId.trim()],
        }),
      });
      if (!orderRes.ok) {
        const orderData = await orderRes.json().catch(() => ({}));
        // Container was created — warn but don't fail hard
        console.warn('Order creation failed:', orderData.message);
      }

      setShowCreate(false);
      setCreateForm({ containerId: '', containerTypeId: containerTypes[0]?.id ?? 0, cargoTypeId: cargoTypes[0]?.id ?? 0, grossWeight: '', note: '' });
      await fetchContainers(0);
    } catch (e: any) {
      setCreateError(e.message || 'Lỗi không xác định');
    } finally {
      setCreating(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title">Container của tôi</h1>
            <p className="page-subtitle">Xem trạng thái và thông tin container của bạn.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setShowCreate(true); setCreateError(''); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm container
            </Button>
            <Button variant="outline" onClick={() => fetchContainers(0)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* ── Create modal ────────────────────────────────────────────────── */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Thêm container mới</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã container *</label>
                  <Input
                    value={createForm.containerId}
                    onChange={(e) => setCreateForm({ ...createForm, containerId: e.target.value })}
                    placeholder="VD: CTN-2026-0001"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-400 mt-1">Tối đa 20 ký tự, không trùng với container hiện có</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Loại container *</label>
                  <select
                    value={createForm.containerTypeId}
                    onChange={(e) => setCreateForm({ ...createForm, containerTypeId: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                  >
                    {containerTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Loại hàng *</label>
                  <select
                    value={createForm.cargoTypeId}
                    onChange={(e) => setCreateForm({ ...createForm, cargoTypeId: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                  >
                    {cargoTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Trọng lượng (kg)</label>
                  <Input
                    type="number"
                    value={createForm.grossWeight}
                    onChange={(e) => setCreateForm({ ...createForm, grossWeight: e.target.value })}
                    placeholder="VD: 18500"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <textarea
                    value={createForm.note}
                    onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                    placeholder="Ghi chú thêm (không bắt buộc)"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-gray-800"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Xác nhận'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)} disabled={creating}>
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchContainers(0)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
              <CardTitle>Danh sách container ({loading ? '...' : containers.length})</CardTitle>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo mã, loại, trạng thái..."
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[640px] overflow-y-auto pr-2">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Đang tải...</div>
            ) : (
              <>
                {filtered.map((c) => (
                  <div key={c.containerId} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="rounded-3xl bg-blue-500 p-3 text-white flex-shrink-0">
                          <Container className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{c.containerId}</h2>
                            {c.statusName && (
                              <Badge className={statusBadge(c.statusName)}>{c.statusName}</Badge>
                            )}
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-gray-600 dark:text-gray-300">
                            {c.containerTypeName && (
                              <div><span className="font-semibold">Loại:</span> {c.containerTypeName}</div>
                            )}
                            {c.cargoTypeName && (
                              <div><span className="font-semibold">Hàng hoá:</span> {c.cargoTypeName}</div>
                            )}
                            {c.grossWeight != null && (
                              <div><span className="font-semibold">Trọng lượng:</span> {c.grossWeight} kg</div>
                            )}
                            {c.sealNumber && (
                              <div><span className="font-semibold">Seal:</span> {c.sealNumber}</div>
                            )}
                            {c.createdAt && (
                              <div><span className="font-semibold">Ngày tạo:</span> {new Date(c.createdAt).toLocaleDateString('vi-VN')}</div>
                            )}
                            {c.attributeName && (
                              <div><span className="font-semibold">Thuộc tính:</span> {c.attributeName}</div>
                            )}
                          </div>
                          {c.note && (
                            <div className="mt-2 text-xs text-gray-500 italic">{c.note}</div>
                          )}
                        </div>
                      </div>
                      {c.manifestId && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-xs text-gray-400">Manifest #{c.manifestId}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    Không có container phù hợp.{' '}
                    <button className="text-blue-600 underline" onClick={() => setShowCreate(true)}>
                      Thêm container mới?
                    </button>
                  </div>
                )}
              </>
            )}

            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => fetchContainers(page - 1)} disabled={page === 0}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchContainers(page + 1)} disabled={page >= totalPages - 1}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
