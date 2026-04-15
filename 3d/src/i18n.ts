import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  vi: {
    translation: {
      topbar: {
        notifications: 'Thông báo',
        markAllRead: 'Đọc tất cả',
        emptyNotifications: 'Không có thông báo.',
        messages: 'Tin nhắn',
        messagesSoon: 'Chức năng tin nhắn sẽ được bổ sung sau.',
        settings: 'Cài đặt',
        close: 'Đóng',
        overview: 'Về trang tổng quan',
        systemInfo: 'Thông tin hệ thống',
        systemInfoSoon: 'Chức năng cài đặt nâng cao sẽ được bổ sung sau.',
      },
      breadcrumbs: {
        overview: 'Tổng quan 3D kho bãi',
        ops: 'Điều độ bãi & Tối ưu hóa',
        map3d: 'Sơ đồ 3D trực quan',
        map2d: 'Sơ đồ 2D mặt phẳng',
        gateIn: 'Quản lý nhập bãi',
        gateOut: 'Quản lý xuất bãi',
        warehouse: 'Quản lý Kho',
        warehouseParent: 'Quản lý Kho & Container',
      },
      language: {
        vietnamese: 'Tiếng Việt',
        english: 'English',
      },
    },
  },
  en: {
    translation: {
      topbar: {
        notifications: 'Notifications',
        markAllRead: 'Mark all read',
        emptyNotifications: 'No notifications.',
        messages: 'Messages',
        messagesSoon: 'Messaging will be added later.',
        settings: 'Settings',
        close: 'Close',
        overview: 'Go to overview',
        systemInfo: 'System info',
        systemInfoSoon: 'Advanced settings will be added later.',
      },
      breadcrumbs: {
        overview: '3D Yard Overview',
        ops: 'Yard Operations & Optimization',
        map3d: '3D Map',
        map2d: '2D Map',
        gateIn: 'Gate-in Management',
        gateOut: 'Gate-out Management',
        warehouse: 'Warehouse Management',
        warehouseParent: 'Warehouse & Containers',
      },
      language: {
        vietnamese: 'Tiếng Việt',
        english: 'English',
      },
    },
  },
} as const;

const saved = localStorage.getItem('wms_lang');
const initialLng = saved === 'en' ? 'en' : 'vi';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18n;

