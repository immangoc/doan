import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

type FeeConfig = {
  currency?: string;
  costRate?: number;
  ratePerKgDefault?: number;
  ratePerKgByCargoType?: Record<string, number>;
  freeStorageDays?: number;
  overduePenaltyRate?: number;
  coldStorageSurcharge?: number;
  hazmatSurcharge?: number;
  liftingFeePerMove?: number;
  storageMultiplier?: number;
  weightMultiplier?: number;
  containerRate20ft?: number;
  containerRate40ft?: number;
  earlyPickupFee?: number;
};

type CargoType = { cargoTypeId: number; cargoTypeName: string };

export default function Payments() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [feeConfig, setFeeConfig]   = useState<FeeConfig | null>(null);
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
        const [feeRes, ctRes] = await Promise.all([
          fetch(`${API_BASE}/admin/fees`, { headers }),
          fetch(`${API_BASE}/admin/cargo-types`, { headers }),
        ]);
        const feeData = await feeRes.json();
        const ctData  = await ctRes.json();
        if (feeRes.ok) setFeeConfig(feeData.data);
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
    const cfg = feeConfig;

    if (!cfg) {
      setResult(`Thời gian lưu kho: ${totalDays} ngày. Vui lòng liên hệ để biết chi phí.`);
      return;
    }

    const freeDays        = cfg.freeStorageDays   ?? 3;
    const billDays        = Math.max(0, totalDays - freeDays);
    const currency        = cfg.currency           || 'VND';
    const storageMult     = cfg.storageMultiplier  ?? 1;
    const weightMult      = cfg.weightMultiplier   ?? 1;
    const fmt = (n: number) => n.toLocaleString('vi-VN');

    // Determine base price
    let basePrice = 0;
    let basePriceDesc = '';

    if (containerSize === '20ft' && (cfg.containerRate20ft ?? 0) > 0) {
      basePrice     = cfg.containerRate20ft!;
      basePriceDesc = `Container 20ft: ${fmt(basePrice)} ${currency}`;
    } else if (containerSize === '40ft' && (cfg.containerRate40ft ?? 0) > 0) {
      basePrice     = cfg.containerRate40ft!;
      basePriceDesc = `Container 40ft: ${fmt(basePrice)} ${currency}`;
    }

    if (kg > 0) {
      let ratePerKg = cfg.ratePerKgDefault ?? 0;
      if (cargoTypeName && cfg.ratePerKgByCargoType) {
        const specific = cfg.ratePerKgByCargoType[cargoTypeName];
        if (specific != null) ratePerKg = specific;
      }
      const weightCost = ratePerKg * kg;
      if (basePrice > 0) {
        basePriceDesc += ` + ${fmt(kg)} kg × ${fmt(ratePerKg)} = ${fmt(weightCost)} ${currency}`;
        basePrice += weightCost;
      } else {
        basePrice     = weightCost;
        basePriceDesc = `${fmt(kg)} kg × ${fmt(ratePerKg)} ${currency}/kg = ${fmt(basePrice)} ${currency}`;
      }
    }

    // Formula: price = base_price × number_of_days × storage_multiplier × weight_multiplier
    const storageFee = basePrice * billDays * storageMult * weightMult;

    const lines: string[] = [];
    lines.push(`Thời gian: ${totalDays} ngày · Miễn phí: ${freeDays} ngày · Tính phí: ${billDays} ngày`);
    if (basePriceDesc) lines.push(`Giá cơ sở: ${basePriceDesc}`);
    if (billDays > 0 && basePrice > 0) {
      lines.push(`Công thức: ${fmt(basePrice)} × ${billDays} ngày × ${storageMult} × ${weightMult} = ${fmt(storageFee)} ${currency}`);
    }

    lines.push(`─────────────────`);
    lines.push(`Tổng ước tính: ${fmt(storageFee)} ${currency}`);

    if (basePrice === 0) lines.push('(Chọn loại container hoặc nhập trọng lượng để tính phí)');

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
                Thông số phí hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!feeConfig ? (
                <div className="text-gray-400 text-center py-6">Đang tải...</div>
              ) : (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Đơn vị tiền tệ</span>
                    <span className="font-semibold">{feeConfig.currency || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Miễn phí lưu kho</span>
                    <span className="font-semibold">{feeConfig.freeStorageDays ?? '—'} ngày</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Phí/kg mặc định</span>
                    <span className="font-semibold">{feeConfig.ratePerKgDefault != null ? feeConfig.ratePerKgDefault.toLocaleString('vi-VN') : '—'} {feeConfig.currency}</span>
                  </div>
                  {feeConfig.overduePenaltyRate != null && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Tỉ lệ phạt quá hạn</span>
                      <span className="font-semibold">{(feeConfig.overduePenaltyRate * 100).toFixed(2)}%/ngày</span>
                    </div>
                  )}
                  {feeConfig.liftingFeePerMove != null && feeConfig.liftingFeePerMove > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Phí nâng/hạ</span>
                      <span className="font-semibold">{feeConfig.liftingFeePerMove.toLocaleString('vi-VN')} {feeConfig.currency}/lần</span>
                    </div>
                  )}
                  {feeConfig.storageMultiplier != null && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Hệ số lưu kho</span>
                      <span className="font-semibold">× {feeConfig.storageMultiplier}</span>
                    </div>
                  )}
                  {feeConfig.weightMultiplier != null && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Hệ số trọng lượng</span>
                      <span className="font-semibold">× {feeConfig.weightMultiplier}</span>
                    </div>
                  )}
                  {feeConfig.containerRate20ft != null && feeConfig.containerRate20ft > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Giá container 20ft</span>
                      <span className="font-semibold">{feeConfig.containerRate20ft.toLocaleString('vi-VN')} {feeConfig.currency}</span>
                    </div>
                  )}
                  {feeConfig.containerRate40ft != null && feeConfig.containerRate40ft > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Giá container 40ft</span>
                      <span className="font-semibold">{feeConfig.containerRate40ft.toLocaleString('vi-VN')} {feeConfig.currency}</span>
                    </div>
                  )}
                  {feeConfig.earlyPickupFee != null && feeConfig.earlyPickupFee > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Phí xuất sớm</span>
                      <span className="font-semibold">{feeConfig.earlyPickupFee.toLocaleString('vi-VN')} {feeConfig.currency}</span>
                    </div>
                  )}
                  {feeConfig.ratePerKgByCargoType && Object.keys(feeConfig.ratePerKgByCargoType).length > 0 && (
                    <>
                      <div className="text-xs text-gray-400 pt-2">Phí theo loại hàng:</div>
                      {Object.entries(feeConfig.ratePerKgByCargoType).map(([type, rate]) => (
                        <div key={type} className="flex justify-between py-1 pl-2">
                          <span className="text-gray-500">{type}</span>
                          <span className="font-semibold">{rate.toLocaleString('vi-VN')} {feeConfig.currency}/kg</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WarehouseLayout>
  );
}
