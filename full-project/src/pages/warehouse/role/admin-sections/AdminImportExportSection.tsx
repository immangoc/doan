import { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type DailyGate = { date: string; gateIn: number; gateOut: number };
type GateReport = { from: string; to: string; totalGateIn: number; totalGateOut: number; daily: DailyGate[] };

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

export default function AdminImportExportSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo]     = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [report, setReport]   = useState<GateReport | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/admin/reports/gate-activity?from=${from}&to=${to}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải báo cáo');
      setReport(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nhập xuất theo ngày</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Thống kê lượt gate-in / gate-out theo khoảng thời gian.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Chọn khoảng thời gian</CardTitle>
            <div className="mt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500">Từ ngày</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Đến ngày</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
              </div>
              <Button onClick={fetchReport} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Đang tải...' : 'Tải báo cáo'}
              </Button>
            </div>
          </CardHeader>

          {report && (
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{report.totalGateIn}</div>
                  <div className="text-sm text-blue-600 mt-1">Tổng Gate-In</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-700">{report.totalGateOut}</div>
                  <div className="text-sm text-orange-600 mt-1">Tổng Gate-Out</div>
                </div>
              </div>

              {/* Line chart */}
              {report.daily.length > 0 && (
                <>
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300">Biểu đồ theo ngày</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={report.daily} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gateIn"  stroke="#3b82f6" name="Gate-In"  strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="gateOut" stroke="#f97316" name="Gate-Out" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Bar chart */}
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300">Cột so sánh ngày</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={report.daily} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="gateIn"  fill="#3b82f6" name="Gate-In" />
                      <Bar dataKey="gateOut" fill="#f97316" name="Gate-Out" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Gate-In</TableHead>
                        <TableHead className="text-right">Gate-Out</TableHead>
                        <TableHead className="text-right">Chênh lệch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.daily.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>{d.date}</TableCell>
                          <TableCell className="text-right text-blue-600 font-medium">{d.gateIn}</TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">{d.gateOut}</TableCell>
                          <TableCell className={`text-right font-medium ${d.gateIn - d.gateOut > 0 ? 'text-green-600' : d.gateIn - d.gateOut < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {d.gateIn - d.gateOut > 0 ? '+' : ''}{d.gateIn - d.gateOut}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          )}

          {!report && !loading && (
            <CardContent>
              <div className="text-center py-12 text-gray-400">Chọn khoảng thời gian và nhấn "Tải báo cáo"</div>
            </CardContent>
          )}
        </Card>
      </div>
    </WarehouseLayout>
  );
}
