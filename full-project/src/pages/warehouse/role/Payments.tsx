import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

type Tariff = {
  tariffId: number;
  tariffCode: string;
  tariffName: string;
  feeType: string;
  containerSize?: number;
  cargoTypeId?: number;
  cargoTypeName?: string;
  unitPrice: number;
  unit: string;
  note?: string;
};

type CargoType = { cargoTypeId: number; cargoTypeName: string };

export default function Payments() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [tariffs, setTariffs]       = useState<Tariff[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);

  // Form inputs
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [weight,         setWeight]         = useState('');
  const [cargoTypeName,  setCargoTypeName]  = useState('');
  const [containerSize,  setContainerSize]  = useState<'' | '20ft' | '40ft'>('');

  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tariffsRes, ctRes] = await Promise.all([
          fetch(`${API_BASE}/admin/tariffs`, { headers, cache: 'no-cache' }),
          fetch(`${API_BASE}/admin/cargo-types`, { headers, cache: 'no-cache' }),
        ]);
        const tariffsData = await tariffsRes.json();
        const ctData  = await ctRes.json();
        if (tariffsRes.ok) setTariffs(tariffsData.data || []);
        if (ctRes.ok)  setCargoTypes(ctData.data || []);
      } catch { /* ignore */ }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = () => {
    if (!startDate || !endDate) {
      setResult('Vui lòng chọn đủ ngày nhập và ngày xuất.');
      return;
    }
    const totalDays = Math.max(1, Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    ));

    const kg = parseFloat(weight) || 0;
    const tons = kg / 1000;
    const sizeNum = containerSize === '20ft' ? 20 : (containerSize === '40ft' ? 40 : 20); // Default to 20ft if empty

    if (!tariffs.length) {
      setResult(`Thời gian lưu kho: ${totalDays} ngày. Đang tải bảng giá...`);
      return;
    }

    const fmt = (n: number) => n.toLocaleString('vi-VN');

    // 1. Time multiplier
    let timeMult = 1;
    const tmult1 = tariffs.find(t => t.tariffCode === 'TIME_MULTIPLIER_LE_5');
    const tmult2 = tariffs.find(t => t.tariffCode === 'TIME_MULTIPLIER_6_10');
    const tmult3 = tariffs.find(t => t.tariffCode === 'TIME_MULTIPLIER_GT_10');
    if (totalDays <= 5 && tmult1) timeMult = tmult1.unitPrice;
    else if (totalDays >= 6 && totalDays <= 10 && tmult2) timeMult = tmult2.unitPrice;
    else if (totalDays > 10 && tmult3) timeMult = tmult3.unitPrice;

    // 2. Weight multiplier
    let weightMult = 1;
    const wmult1 = tariffs.find(t => t.tariffCode === 'WEIGHT_MULTIPLIER_LT_10');
    const wmult2 = tariffs.find(t => t.tariffCode === 'WEIGHT_MULTIPLIER_10_20');
    const wmult3 = tariffs.find(t => t.tariffCode === 'WEIGHT_MULTIPLIER_GT_20');
    if (tons < 10 && wmult1) weightMult = wmult1.unitPrice;
    else if (tons >= 10 && tons <= 20 && wmult2) weightMult = wmult2.unitPrice;
    else if (tons > 20 && wmult3) weightMult = wmult3.unitPrice;

    // 3. Storage base rate
    let dailyRate = 150000; // ultimate fallback
    const specific = tariffs.find(t => t.feeType === 'STORAGE' && t.containerSize === sizeNum && t.cargoTypeName === cargoTypeName);
    if (specific) {
      dailyRate = specific.unitPrice;
    } else {
      const fallback = tariffs.find(t => t.feeType === 'STORAGE' && t.containerSize === sizeNum);
      if (fallback) dailyRate = fallback.unitPrice;
    }

    // Formula: price = dailyRate * totalDays * timeMult * weightMult
    const storageFee = dailyRate * totalDays * timeMult * weightMult;

    const lines: string[] = [];
    lines.push(`Thời gian: ${totalDays} ngày`);
    lines.push(`Giá lưu kho cơ sở (${sizeNum}ft${cargoTypeName ? ' - ' + cargoTypeName : ''}): ${fmt(dailyRate)} VND/ngày`);
    lines.push(`Hệ số thời gian: × ${timeMult} (dựa trên số ngày)`);
    lines.push(`Hệ số trọng lượng: × ${weightMult} (dựa trên ${tons} tấn)`);
    lines.push(`Công thức: ${fmt(dailyRate)} × ${totalDays} ngày × ${timeMult} × ${weightMult} = ${fmt(Math.round(storageFee))} VND`);
    
    lines.push(`─────────────────`);
    lines.push(`Tổng ước tính: ${fmt(Math.round(storageFee))} VND`);

    setResult(lines.join('\n'));
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Tra cứu & tiện ích</h1>
          <p className="page-subtitle">Tính toán chi phí lưu kho theo trọng lượng và loại hàng.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Tra cứu cước phí lưu kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Ngày nhập kho</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Ngày xuất kho</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Loại container</label>
                  <select
                    value={containerSize}
                    onChange={(e) => setContainerSize(e.target.value as '' | '20ft' | '40ft')}
                    className="h-12 w-full border border-gray-300 rounded-md px-3 text-sm bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Không chọn (tính theo kg) --</option>
                    <option value="20ft">20ft</option>
                    <option value="40ft">40ft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Loại hàng hóa</label>
                  <select
                    value={cargoTypeName}
                    onChange={(e) => setCargoTypeName(e.target.value)}
                    className="h-12 w-full border border-gray-300 rounded-md px-3 text-sm bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Mặc định --</option>
                    {cargoTypes.map((ct) => (
                      <option key={ct.cargoTypeId} value={ct.cargoTypeName}>{ct.cargoTypeName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Trọng lượng (kg)</label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="VD: 18500"
                    min={0}
                    className="h-12"
                  />
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleLookup}>
                <Calculator className="w-4 h-4 mr-2" />
                Tính chi phí
              </Button>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Kết quả ước tính</div>
                <div className="min-h-[60px] text-sm font-medium text-gray-900 dark:text-white whitespace-pre-line">
                  {result || 'Điền thông tin và nhấn "Tính chi phí".'}
                </div>
              </div>

              <p className="text-xs text-gray-400">* Kết quả chỉ mang tính chất tham khảo. Chi phí thực tế có thể thay đổi theo hợp đồng.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Bảng giá dịch vụ (Tariffs)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 text-sm max-h-[500px] overflow-y-auto pr-2">
              {!tariffs.length ? (
                <div className="text-gray-400 text-center py-6">Đang tải...</div>
              ) : (
                <div className="space-y-1">
                  {tariffs.map(t => (
                    <div key={t.tariffId} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                      <div className="flex flex-col flex-1 pr-4">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{t.tariffName}</span>
                        {t.note && <span className="text-xs text-gray-500 mt-0.5">{t.note}</span>}
                      </div>
                      <span className="font-semibold whitespace-nowrap text-indigo-700 dark:text-indigo-400">
                        {t.unitPrice === 1 && t.unit === 'MULTIPLIER' ? 'Mặc định' : (
                          t.unit === 'MULTIPLIER' ? `× ${t.unitPrice}` : `${t.unitPrice.toLocaleString('vi-VN')} VND`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WarehouseLayout>
  );
}
