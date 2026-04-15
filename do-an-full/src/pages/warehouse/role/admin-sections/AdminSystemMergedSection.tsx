import { Users } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import UserManagement from '../../UserManagement';

export default function AdminSystemMergedSection() {
  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản trị hệ thống</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quản lý người dùng trong hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4" />
          Danh sách người dùng
        </div>
        <UserManagement showLayout={false} hideHeaderTitle />
      </div>
    </WarehouseLayout>
  );
}

