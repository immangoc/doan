import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<'admin' | 'planner' | 'operator' | 'customer'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useWarehouseAuth();

  // Đang kiểm tra session → hiện loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập → về trang login
  if (!user) {
    return <Navigate to="/warehouse/login" replace />;
  }

  // Có role restriction và user không đủ quyền → redirect đến dashboard đúng role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardByRole: Record<string, string> = {
      admin:    '/warehouse/admin/dashboard',
      planner:  '/warehouse/planner/dashboard',
      operator: '/warehouse/operator/dashboard',
      customer: '/warehouse/customer/dashboard',
    };
    return <Navigate to={dashboardByRole[user.role] || '/warehouse/login'} replace />;
  }

  return <>{children}</>;
}
