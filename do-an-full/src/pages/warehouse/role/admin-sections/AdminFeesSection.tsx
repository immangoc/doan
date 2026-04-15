import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Save, RefreshCw } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type CargoType = { id: string; name: string };

type FeesConfig = {
  id?: string;
  currency?: string;
  costRate?: number;
  ratePerKgDefault?: number;
  ratePerKgByCargoType?: Record<string, number>;
  updated_at?: string;
};

export default function AdminFeesSection() {
  const { accessToken } = useWarehouseAuth();
  const apiUrl = API_BASE;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [fees, setFees] = useState<FeesConfig>({
    currency: 'VND',
    costRate: 0.35,
    ratePerKgDefault: 1000,
    ratePerKgByCargoType: {},
  });

  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, fRes] = await Promise.all([
        fetch(`${apiUrl}/admin/cargo-types`, { headers }),
        fetch(`${apiUrl}/admin/fees`, { headers }),
      ]);
      const tData = await tRes.json();
      const fData = await fRes.json();
      if (!tRes.ok) throw new Error(tData.message || 'Lỗi lấy loại hàng');
      if (!fRes.ok) throw new Error(fData.message || 'Lỗi lấy cước phí');
      const rawT: { cargoTypeId: number; cargoTypeName: string }[] = tData.data || [];
      setCargoTypes(rawT.map(it => ({ id: String(it.cargoTypeId), name: it.cargoTypeName })));
      if (fData.data) {
        const f = fData.data;
        setFees({ id: String(f.configId), currency: f.currency, costRate: f.costRate, ratePerKgDefault: f.ratePerKgDefault, ratePerKgByCargoType: f.ratePerKgByCargoType || {}, updated_at: f.updatedAt });
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rateFor = (cargoTypeName: string) => {
    const by = fees.ratePerKgByCargoType || {};
    const value = by[cargoTypeName];
    if (typeof value === 'number') return value;
    return fees.ratePerKgDefault || 0;
  };

  const setRateFor = (cargoTypeName: string, value: number) => {
    setFees((prev) => ({
      ...prev,
      ratePerKgByCargoType: {
        ...(prev.ratePerKgByCargoType || {}),
        [cargoTypeName]: value,
      },
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      const payload: FeesConfig = {
        currency: fees.currency || 'VND',
        costRate: Number(fees.costRate),
        ratePerKgDefault: Number(fees.ratePerKgDefault),
        ratePerKgByCargoType: fees.ratePerKgByCargoType || {},
      };
      const res = await fetch(`${apiUrl}/admin/fees`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật cước phí');
      await fetchAll();
      alert('Cập nhật cước phí thành công');
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  };

  const warehouseRows = useMemo(
    () => [
      { key: 'fragile', label: 'Kho dễ vỡ', cargoType: 'Điện tử' },
      { key: 'other', label: 'Kho khác', cargoType: 'Nông sản' },
      { key: 'cold', label: 'Kho lạnh', cargoType: 'Thực phẩm đông lạnh' },
      { key: 'damaged', label: 'Kho hỏng', cargoType: 'Hàng dệt may' },
      { key: 'dry', label: 'Kho khô', cargoType: 'Hóa chất công nghiệp' },
    ],
    [],
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý cước phí (Cấu hình biểu cước)</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Cấu hình hệ số dùng để ước tính doanh thu/lợi nhuận trong các báo cáo.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-600" />
              Cấu hình
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Button variant="outline" onClick={fetchAll} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={save} disabled={saving || loading}>
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Cost rate (0-1)</div>
                <Input
                  type="number"
                  step={0.01}
                  value={fees.costRate ?? 0}
                  onChange={(e) => setFees((p) => ({ ...p, costRate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Rate theo kg (mặc định)</div>
                <Input
                  type="number"
                  step={1}
                  value={fees.ratePerKgDefault ?? 0}
                  onChange={(e) => setFees((p) => ({ ...p, ratePerKgDefault: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Đơn vị tiền</div>
                <Input value={fees.currency ?? 'VND'} onChange={(e) => setFees((p) => ({ ...p, currency: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">Rate theo từng loại kho</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại kho</TableHead>
                    <TableHead className="text-right">Rate/kg</TableHead>
                    <TableHead>Ánh xạ loại hàng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseRows.map((w) => {
                    const mappedExists = cargoTypes.some((t) => t.name === w.cargoType);
                    return (
                      <TableRow key={w.key}>
                        <TableCell className="font-semibold">{w.label}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step={1}
                            value={rateFor(w.cargoType)}
                            onChange={(e) => setRateFor(w.cargoType, Number(e.target.value))}
                            disabled={!mappedExists}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {w.cargoType}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}

