import { useState } from 'react';
import { Download, AlertCircle, BarChart3, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import AdminReportsSection from './AdminReportsSection';

type Mode = 'revenue_profit' | 'damage_summary' | 'export_report';

export default function AdminReportsMergedSection() {
  // Theo warehouse-management.html: tab “Tổng quan” và “Tổng hợp hàng hỏng”.
  const [tab, setTab] = useState<'tongquan' | 'hanghong'>('tongquan');
  const [focusReport, setFocusReport] = useState<'all' | 'cold' | 'fragile' | 'dry'>('all');
  const activeMode: Mode = tab === 'tongquan' ? 'revenue_profit' : 'damage_summary';

  const quickReportCards = [
    { label: 'Kho lạnh', type: 'cold' as const, subtitle: 'Báo cáo hàng lạnh', active: focusReport === 'cold' },
    { label: 'Kho dễ vỡ', type: 'fragile' as const, subtitle: 'Báo cáo hàng dễ vỡ', active: focusReport === 'fragile' },
    { label: 'Kho khô', type: 'dry' as const, subtitle: 'Báo cáo kho khô', active: focusReport === 'dry' },
  ];

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Báo cáo & Thống kê</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Phân tích dữ liệu theo thời gian thực</p>
          </div>

          <div className="flex gap-3">
            <Link to="/warehouse/admin/section/xuat-bao-cao">
              <Button className="gap-2 bg-blue-700 hover:bg-blue-800 text-white">
                <Download className="w-4 h-4" />
                ⬇ Xuất báo cáo
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs (giống html) */}
        <Card>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={tab === 'tongquan' ? 'default' : 'outline'}
                onClick={() => setTab('tongquan')}
                className={tab === 'tongquan' ? 'bg-blue-900 hover:bg-blue-800 text-white' : ''}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Tổng quan
              </Button>
              <Button
                variant={tab === 'hanghong' ? 'default' : 'outline'}
                onClick={() => setTab('hanghong')}
                className={tab === 'hanghong' ? 'bg-blue-900 hover:bg-blue-800 text-white' : ''}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Tổng hợp hàng hỏng
              </Button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Chọn tab để xem báo cáo chi tiết hơn.</span>
            </div>
          </CardContent>
        </Card>

        {tab === 'hanghong' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Báo cáo chi tiết theo nhóm hàng</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickReportCards.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setFocusReport(item.type);
                    setTab('hanghong');
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all ${item.active ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 shadow-sm' : 'border-gray-200 bg-white dark:bg-gray-800 hover:border-blue-400'}`}
                >
                  <div className="text-sm font-semibold mb-2">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Render nội dung báo cáo, không lồng WarehouseLayout lần nữa */}
        <AdminReportsSection mode={activeMode} showLayout={false} hideTitle focusDamageCategory={focusReport} />
      </div>
    </WarehouseLayout>
  );
}

