import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../components/warehouse/WarehouseLayout';
import {
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Warehouse,
  Calendar,
  BarChart3,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function WarehouseDashboard() {
  const [stats, setStats] = useState({
    total_containers: 248,
    in_storage: 185,
    exported: 63,
    pending: 12,
    occupancy_rate: 74,
  });

  const zoneData = [
    { name: 'Zone A', containers: 85, capacity: 100, fill: '#1e40af' },
    { name: 'Zone B', containers: 62, capacity: 80, fill: '#3b82f6' },
    { name: 'Zone C', containers: 38, capacity: 60, fill: '#60a5fa' },
    { name: 'Zone D', containers: 0, capacity: 50, fill: '#93c5fd' },
  ];

  const monthlyData = [
    { month: 'T1', import: 120, export: 95 },
    { month: 'T2', import: 145, export: 110 },
    { month: 'T3', import: 168, export: 142 },
    { month: 'T4', import: 195, export: 178 },
    { month: 'T5', import: 220, export: 205 },
    { month: 'T6', import: 248, export: 224 },
  ];

  const statusData = [
    { name: 'Đang lưu kho', value: stats.in_storage, color: '#22c55e' },
    { name: 'Đã xuất', value: stats.exported, color: '#3b82f6' },
    { name: 'Chờ xử lý', value: stats.pending, color: '#eab308' },
  ];

  return (
    <WarehouseLayout userRole="admin" userName="Admin Hùng Thủy">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Tổng quan
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Giám sát và quản lý kho bãi container theo thời gian thực
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  Tổng Container
                </CardTitle>
                <Package className="w-5 h-5 text-blue-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_containers}</div>
                <p className="text-xs text-blue-100 mt-1">
                  +12% so với tháng trước
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-100">
                  Đang lưu kho
                </CardTitle>
                <CheckCircle className="w-5 h-5 text-green-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.in_storage}</div>
                <p className="text-xs text-green-100 mt-1">
                  {((stats.in_storage / stats.total_containers) * 100).toFixed(1)}% tổng số
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">
                  Tỷ lệ lấp đầy
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-orange-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.occupancy_rate}%</div>
                <div className="w-full bg-orange-300 rounded-full h-2 mt-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${stats.occupancy_rate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-100">
                  Chờ xử lý
                </CardTitle>
                <AlertCircle className="w-5 h-5 text-yellow-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pending}</div>
                <p className="text-xs text-yellow-100 mt-1">
                  Cần được xử lý trong 24h
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Import/Export Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Nhập/Xuất Container 6 tháng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="import" fill="#3b82f6" name="Nhập kho" />
                    <Bar dataKey="export" fill="#22c55e" name="Xuất kho" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Phân bổ trạng thái Container
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Zone Occupancy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-600" />
                Tình trạng lấp đầy theo khu vực
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zoneData.map((zone, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {zone.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {zone.containers}/{zone.capacity} ({((zone.containers / zone.capacity) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(zone.containers / zone.capacity) * 100}%` }}
                        transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                        className="h-3 rounded-full"
                        style={{ backgroundColor: zone.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Nhập container', code: 'TEMU1234567', user: 'Nguyễn Văn A', time: '10 phút trước', type: 'import' },
                  { action: 'Xuất container', code: 'CSNU9876543', user: 'Trần Thị B', time: '25 phút trước', type: 'export' },
                  { action: 'Cập nhật vị trí', code: 'HLXU2468135', user: 'Lê Văn C', time: '1 giờ trước', type: 'update' },
                  { action: 'Thêm container mới', code: 'MSCU1357924', user: 'Phạm Thị D', time: '2 giờ trước', type: 'create' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'import' ? 'bg-blue-100 dark:bg-blue-900' :
                      activity.type === 'export' ? 'bg-green-100 dark:bg-green-900' :
                      activity.type === 'update' ? 'bg-orange-100 dark:bg-orange-900' :
                      'bg-purple-100 dark:bg-purple-900'
                    }`}>
                      <Package className={`w-5 h-5 ${
                        activity.type === 'import' ? 'text-blue-600' :
                        activity.type === 'export' ? 'text-green-600' :
                        activity.type === 'update' ? 'text-orange-600' :
                        'text-purple-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {activity.action}: <span className="text-blue-600">{activity.code}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {activity.user} • {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </WarehouseLayout>
  );
}
