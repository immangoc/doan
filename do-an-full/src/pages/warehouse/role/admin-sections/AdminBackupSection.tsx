import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Database, Info, Server } from 'lucide-react';

export default function AdminBackupSection() {
  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sao lưu dữ liệu</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Thông tin về chính sách sao lưu hệ thống.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Sao lưu hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <div className="font-semibold">Tính năng không khả dụng qua giao diện này</div>
                <div>
                  Việc sao lưu dữ liệu được thực hiện tự động ở cấp hạ tầng (database server, cloud backup)
                  và không được cung cấp qua API REST của hệ thống.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <Server className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <div className="font-medium">Để thực hiện sao lưu dữ liệu, liên hệ quản trị viên hệ thống để:</div>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Chạy pg_dump để xuất dữ liệu PostgreSQL</li>
                  <li>Kiểm tra lịch sao lưu tự động trên hạ tầng</li>
                  <li>Khôi phục từ snapshot nếu cần thiết</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
