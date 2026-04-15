import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { API_BASE } from '../../../contexts/WarehouseAuthContext';

type FeeConfig = {
  dailyStorageRate: number;
  overdueStorageRate: number;
  freeStorageDays: number;
};

export default function Payments() {
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [result, setResult]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/fee-config`)
      .then((r) => r.json())
      .then((d) => { if (d.data) setFeeConfig(d.data); })
      .catch(() => {});
  }, []);

  const handleLookup = () => {
    if (!startDate || !endDate) {
      setResult('Vui lòng chọn đủ ngày nhập và ngày xuất.');
      return;
    }
    const totalDays = Math.max(1, Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    ));
    if (feeConfig) {
      const freeDays  = Math.min(totalDays, feeConfig.freeStorageDays);
      const billDays  = Math.max(0, totalDays - feeConfig.freeStorageDays);
      const fee       = billDays * feeConfig.dailyStorageRate;
      setResult(
        `${totalDays} ngày lưu kho · ${freeDays} ngày miễn phí · ${billDays} ngày tính phí × $${feeConfig.dailyStorageRate}/ngày = $${fee.toFixed(2)}`,
      );
    } else {
      setResult(`Thời gian lưu kho: ${totalDays} ngày. Vui lòng liên hệ để biết chi phí cụ thể.`);
    }
  };

  const rateTable = feeConfig
    ? [
        { label: 'Miễn phí lưu trữ', value: `${feeConfig.freeStorageDays} ngày đầu` },
        { label: 'Phí lưu trữ hàng ngày', value: `$${feeConfig.dailyStorageRate}/ngày` },
        { label: 'Phí lưu trữ quá hạn', value: `$${feeConfig.overdueStorageRate}/ngày` },
      ]
    : null;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title">Tra cứu & tiện ích</h1>
            <p className="page-subtitle">Tra cứu cước phí theo ngày nhập, ngày xuất.</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Tra cứu cước phí
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Ngày nhập</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12" />
                </div>
                <div>
                  <label className="form-label">Ngày xuất</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12" />
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleLookup}>
                Tra cứu
              </Button>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Kết quả ước tính cước phí</div>
                <div className="mt-3 min-h-[52px] text-base font-semibold text-gray-900 dark:text-white">
                  {result || 'Nhấn Tra cứu để hiển thị số tiền.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Biểu cước kho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!rateTable ? (
                <div className="text-sm text-gray-400 text-center py-6">Đang tải biểu cước...</div>
              ) : (
                rateTable.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      </div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">{item.value}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tiện ích nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Tra cứu cước phí</div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nhập ngày nhập, ngày xuất để biết chi phí lưu kho.</p>
              </div>
              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Miễn phí lưu trữ</div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {feeConfig ? `${feeConfig.freeStorageDays} ngày đầu miễn phí kể từ ngày nhập kho.` : 'Xem bảng biểu cước bên trên.'}
                </p>
              </div>
              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Liên hệ hỗ trợ</div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Để được báo giá chính xác, vui lòng liên hệ bộ phận vận hành.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
