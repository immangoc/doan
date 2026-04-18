import ChatBox from '../../../../components/warehouse/ChatBox';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';

export default function AdminChatSupportSection() {
  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hỗ trợ khách hàng (Chatbox)</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Chat hỗ trợ nhanh theo kịch bản có sẵn (bot giả lập).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Khung chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[560px]">
              <ChatBox />
              {/* ChatBox là component nổi cố định; thêm khoảng trống để không bị che nội dung */}
              <div className="h-[520px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}

