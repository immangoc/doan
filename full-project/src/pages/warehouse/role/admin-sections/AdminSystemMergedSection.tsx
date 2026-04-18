import { useState } from 'react';
import { Shield, Users } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import UserManagement from '../../UserManagement';
import AdminRolesSection from './AdminRolesSection';

type Tab = 'users' | 'roles';

export default function AdminSystemMergedSection() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản trị hệ thống</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quản lý người dùng và phân quyền trong hệ thống.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Người dùng
          </button>
          <button
            onClick={() => setTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Quản lý Role
          </button>
        </div>

        {tab === 'users' && <UserManagement showLayout={false} hideHeaderTitle />}
        {tab === 'roles' && <AdminRolesSection />}
      </div>
    </WarehouseLayout>
  );
}

