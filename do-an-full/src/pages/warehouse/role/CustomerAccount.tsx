import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import CustomerAccountForm from '../admin/QuanLyTaiKhoan';

export default function CustomerAccount() {
  return (
    <WarehouseLayout>
      <CustomerAccountForm
        title="Tài khoản của tôi"
        subtitle="Quản lý hồ sơ và bảo mật tài khoản khách hàng"
      />
    </WarehouseLayout>
  );
}
