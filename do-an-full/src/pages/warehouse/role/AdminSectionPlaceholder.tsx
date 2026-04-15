import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import AdminAuthSection from './admin-sections/AdminAuthSection';
import AdminChatSupportSection from './admin-sections/AdminChatSupportSection';
import AdminActivitiesSection from './admin-sections/AdminActivitiesSection';
import AdminNotificationsSection from './admin-sections/AdminNotificationsSection';
import AdminBackupSection from './admin-sections/AdminBackupSection';
import AdminImportExportSection from './admin-sections/AdminImportExportSection';
import AdminAlertsCenterSection from './admin-sections/AdminAlertsCenterSection';
import AdminContainerTypesSection from './admin-sections/AdminContainerTypesSection';
import AdminCargoTypesSection from './admin-sections/AdminCargoTypesSection';
import AdminSchedulesSection from './admin-sections/AdminSchedulesSection';
import AdminShippingCompaniesSection from './admin-sections/AdminShippingCompaniesSection';
import AdminFeesSection from './admin-sections/AdminFeesSection';
import AdminPermissionsSection from './admin-sections/AdminPermissionsSection';
import AdminUsersSection from './admin-sections/AdminUsersSection';
import AdminOrdersSection from './admin-sections/AdminOrdersSection';
import AdminContainersSection from './admin-sections/AdminContainersSection';
import AdminGateInSection from './admin-sections/AdminGateInSection';
import AdminGateOutSection from './admin-sections/AdminGateOutSection';
import AdminYardSection from './admin-sections/AdminYardSection';
import AdminBillsSection from './admin-sections/AdminBillsSection';
import AdminStorageInvoicesSection from './admin-sections/AdminStorageInvoicesSection';
import AdminDashboardSection from './admin-sections/AdminDashboardSection';
import AdminCustomerStatusSection from './admin-sections/AdminCustomerStatusSection';
import AdminAccountMergedSection from './admin-sections/AdminAccountMergedSection';
import AdminReportsMergedSection from './admin-sections/AdminReportsMergedSection';
import AdminSystemMergedSection from './admin-sections/AdminSystemMergedSection';
import AdminReportsSection from './admin-sections/AdminReportsSection';

const TITLE_BY_SLUG: Record<string, string> = {
  'xac-thuc': 'Xác thực',
  'quan-ly-thong-bao': 'Quản lý thông báo',
  'nhat-ky-hoat-dong': 'Nhật ký hoạt động',
  'sao-luu-du-lieu': 'Sao lưu dữ liệu',
  'nhap-xuat-theo-ngay': 'Nhập xuất theo ngày',
  'ho-tro-khach-hang': 'Hỗ trợ khách hàng (Chatbox)',
  'canh-bao-trung-tam-thong-bao': 'Cảnh báo & Trung tâm thông báo',
  'xuat-bao-cao': 'Xuất báo cáo',
  'bao-cao-thong-ke-doanh-thu-loi-nhuan': 'Báo cáo & Thống kê doanh thu, lợi nhuận',
  'bieu-do-hieu-suat-toi-uu': 'Biểu đồ thống kê hiệu suất tối ưu',
  'bao-cao-thong-ke-ton-kho': 'Báo cáo thống kê tồn kho',
  'bao-cao-thong-ke-khach-hang': 'Báo cáo thống kê khách hàng',
  'quan-ly-loai-container': 'Quản lý Loại Container (Thêm/sửa/xóa)',
  'quan-ly-loai-hang': 'Quản lý Loại hàng (Thêm/sửa/xóa)',
  'quan-ly-lich': 'Quản lý Lịch trình',
  'quan-ly-hang-tau': 'Quản lý Hãng tàu',
  'quan-ly-khach-hang-tam-ngung': 'Quản lý Khách hàng (tạm ngưng hoạt động)',
  'quan-ly-cuoc-phi-bieu-cuoc': 'Quản lý cước phí (Cấu hình biểu cước)',
  'quan-ly-nguoi-dung': 'Quản lý người dùng',
  'quan-ly-don-hang': 'Quản lý đơn hàng',
  'quan-ly-container': 'Quản lý container',
  'gate-in': 'Gate-In',
  'gate-out': 'Gate-Out',
  'quan-ly-bai-o-chua': 'Quản lý bãi & ô chứa',
  'van-don': 'Vận đơn (Bill of Lading)',
  'phi-luu-kho': 'Phí lưu kho',
  'dashboard': 'Dashboard',
  'duyet-tai-khoan-khach-hang': 'Duyệt tài khoản khách hàng',
  'quan-ly-phan-quyen': 'Quản lý phân quyền',
  'quan-ly-tai-khoan': 'Quản lý tài khoản',
  'bao-cao-thong-ke': 'Báo cáo & thống kê',
  'quan-tri-he-thong': 'Quản trị hệ thống',
};

export default function AdminSectionPlaceholder() {
  const { slug } = useParams();

  const title = useMemo(() => {
    if (!slug) return 'Chức năng';
    return TITLE_BY_SLUG[slug] || `Chức năng: ${slug}`;
  }, [slug]);

  // Render đúng màn hình theo slug (mỗi trang đã tự bọc WarehouseLayout)
  if (!slug) return null;

  if (slug === 'xac-thuc') return <AdminAuthSection />;
  if (slug === 'ho-tro-khach-hang') return <AdminChatSupportSection />;
  if (slug === 'nhat-ky-hoat-dong') return <AdminActivitiesSection />;
  if (slug === 'quan-ly-thong-bao') return <AdminNotificationsSection />;
  if (slug === 'sao-luu-du-lieu') return <AdminBackupSection />;
  if (slug === 'nhap-xuat-theo-ngay') return <AdminImportExportSection />;
  if (slug === 'canh-bao-trung-tam-thong-bao') return <AdminAlertsCenterSection />;

  if (slug === 'quan-ly-loai-container') return <AdminContainerTypesSection />;
  if (slug === 'quan-ly-loai-hang') return <AdminCargoTypesSection />;
  if (slug === 'quan-ly-lich') return <AdminSchedulesSection />;
  if (slug === 'quan-ly-hang-tau') return <AdminShippingCompaniesSection />;
  if (slug === 'quan-ly-cuoc-phi-bieu-cuoc') return <AdminFeesSection />;
  if (slug === 'quan-ly-phan-quyen') return <AdminPermissionsSection />;
  if (slug === 'quan-ly-nguoi-dung') return <AdminUsersSection />;
  if (slug === 'quan-ly-don-hang') return <AdminOrdersSection />;
  if (slug === 'quan-ly-container') return <AdminContainersSection />;
  if (slug === 'gate-in') return <AdminGateInSection />;
  if (slug === 'gate-out') return <AdminGateOutSection />;
  if (slug === 'quan-ly-bai-o-chua') return <AdminYardSection />;
  if (slug === 'van-don') return <AdminBillsSection />;
  if (slug === 'phi-luu-kho') return <AdminStorageInvoicesSection />;
  if (slug === 'dashboard') return <AdminDashboardSection />;

  if (slug === 'quan-ly-khach-hang-tam-ngung') return <AdminCustomerStatusSection mode="suspend" />;
  if (slug === 'duyet-tai-khoan-khach-hang') return <AdminCustomerStatusSection mode="approve" />;

  // All report slugs → unified AdminReportsSection
  if (
    slug === 'xuat-bao-cao' ||
    slug === 'bao-cao-thong-ke-doanh-thu-loi-nhuan' ||
    slug === 'bieu-do-hieu-suat-toi-uu' ||
    slug === 'bao-cao-thong-ke-ton-kho' ||
    slug === 'bao-cao-thong-ke-khach-hang' ||
    slug === 'bao-cao-thong-ke'
  ) return <AdminReportsSection />;

  if (slug === 'quan-ly-tai-khoan') return <AdminAccountMergedSection />;
  if (slug === 'quan-tri-he-thong') return <AdminSystemMergedSection />;

  // Fallback (không có cấu hình)
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">Chưa có trang cho slug này.</p>
    </div>
  );
}

