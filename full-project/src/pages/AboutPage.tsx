import { motion } from 'motion/react';
import { CheckCircle2, Ship, Users, Globe2, Award, Target, Eye, Heart, Anchor } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import MainLayout from '../components/MainLayout';

const milestones = [
  { year: '2010', title: 'Khởi đầu hành trình', desc: 'Hùng Thủy bắt đầu cung cấp dịch vụ quản lý kho bãi container và tiếp nhận hàng container tại Hải Phòng.' },
  { year: '2014', title: 'Nâng cấp bãi depot', desc: 'Mở rộng diện tích kho bãi tại Đình Vũ, tăng cường năng lực lưu trữ và xử lý container rỗng.' },
  { year: '2018', title: 'Tăng cường liên kết cảng', desc: 'Mở rộng quan hệ với các cảng cửa ngõ và nâng cao năng lực kết nối nội địa với xuất nhập khẩu.' },
  { year: '2021', title: 'Chuyển đổi số', desc: 'Triển khai hệ thống quản lý container thông minh, chú trọng theo dõi thời gian thực và báo cáo hiệu suất.' },
  { year: '2024', title: 'Mở rộng dịch vụ kho bãi', desc: 'Tăng mạnh khả năng tiếp nhận, kiểm soát chất lượng và bảo dưỡng container theo tiêu chuẩn IICL.' },
  { year: '2026', title: 'Định hướng phát triển', desc: 'Khẳng định vị thế trung tâm logistics miền Bắc với giải pháp quản lý kho bãi container an toàn và hiệu quả.' },
];

const values = [
  { icon: Target, title: 'Sứ mệnh', desc: 'Cung cấp giải pháp logistics toàn diện, an toàn và hiệu quả, góp phần thúc đẩy thương mại và kinh tế Việt Nam.' },
  { icon: Eye, title: 'Tầm nhìn', desc: 'Trở thành công ty logistics cảng biển hàng đầu Đông Nam Á vào năm 2030, với công nghệ và dịch vụ vượt trội.' },
  { icon: Heart, title: 'Giá trị cốt lõi', desc: 'Uy tín - Chuyên nghiệp - Đổi mới - Trách nhiệm. Chúng tôi đặt khách hàng và đối tác làm trung tâm mọi quyết định.' },
];

const team = [
  { name: 'Nguyễn Xuân Khải', title: 'Giám đốc', exp: 'Định hướng chiến lược và phát triển kinh doanh' },
  { name: 'Nguyễn Xuân Hùng', title: 'Điều phối', exp: 'Chuyên gia quản lý vận chuyển và kho bãi' },
  { name: 'Nguyễn Thị Thúy', title: 'Quản lý kho', exp: 'Điều hành hoạt động kho bãi và kiểm soát chất lượng' },
];

const certifications = [
  'ISO 9001:2015 - Hệ thống quản lý chất lượng',
  'ISO 14001:2015 - Quản lý môi trường',
  'OHSAS 18001 - Quản lý an toàn lao động',
  'AEO - Doanh nghiệp tuân thủ hải quan',
  'Green Port Certificate - Cảng xanh',
];

export default function AboutPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-blue-900 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1756113820523-e3155455e3a6?w=1920&q=80"
            alt="Port"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 to-blue-800/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-200 rounded-full text-sm font-semibold mb-6">
              <Anchor className="w-4 h-4" />
              Về chúng tôi
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Công ty Vận tải Cảng biển<br />
              <span className="text-blue-300">Hùng Thủy</span>
            </h1>
            <p className="text-blue-100 text-xl max-w-3xl mx-auto leading-relaxed">
              Hơn 15 năm xây dựng và phát triển, Hùng Thủy tự hào là đối tác logistics đáng tin cậy của hàng trăm doanh nghiệp tại Việt Nam và quốc tế.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Đối tác hàng đầu Việt Nam
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                Công ty Vận tải Cảng biển Hùng Thủy được thành lập và vận hành trong bối cảnh hạ tầng logistics tại Hải Phòng đang có sự chuyển dịch mạnh mẽ về phía hạ lưu sông Cấm và khu vực Đình Vũ. Với vị thế là một mắt xích trung chuyển trong chuỗi cung ứng, hoạt động cốt lõi của công ty tập trung vào việc quản trị dòng dịch chuyển của container rỗng và container hàng cho các chủ tàu lớn. Đặc thù bãi (depot) của công ty là điểm kết nối giữa các khu công nghiệp tại Hải Dương, Bắc Ninh với các cảng cửa ngõ. Do đó, lưu lượng hàng hóa tại đây chịu ảnh hưởng trực tiếp bởi tính mùa vụ của thị trường xuất nhập khẩu và các biến động từ lịch trình cập cầu của các tàu mẹ. Sự phức tạp trong quản lý nảy sinh khi đối tượng điều khiển không chỉ là những khối thép vô tri mà còn là sự đan xen giữa các điều kiện kỹ thuật của vỏ container, thời hạn lưu bãi miễn phí và các yêu cầu khắt khe về vệ sinh, sửa chữa theo tiêu chuẩn quốc tế IICL.
              </p>

              <div className="space-y-3">
                {[
                  '1,000+ container được quản lý mỗi năm',
                  '200+ doanh nghiệp đối tác tin tưởng',
                  'Hoạt động 24/7, không có ngày nghỉ',
                  'Đạt nhiều giải thưởng logistics uy tín',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-lg h-48">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1769144256181-698b8f807066?w=400&q=80"
                    alt="Port"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-blue-900 rounded-2xl p-5 text-white text-center">
                  <div className="text-4xl font-bold mb-1">15+</div>
                  <div className="text-blue-300 text-sm">Năm kinh nghiệm</div>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-gray-100 rounded-2xl p-5 text-center">
                  <div className="text-4xl font-bold text-blue-900 mb-1">500+</div>
                  <div className="text-gray-600 text-sm">Nhân viên</div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg h-48">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1769697263718-c25efb356ff5?w=400&q=80"
                    alt="Team"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision Mission Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Sứ mệnh & Tầm nhìn</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Mỗi quyết định của Hùng Thủy đều được định hướng bởi sứ mệnh, tầm nhìn và hệ giá trị cốt lõi rõ ràng.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all text-center"
              >
                <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <v.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{v.title}</h3>
                <p className="text-gray-600 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Hành trình phát triển</h2>
            <p className="text-gray-600">Những cột mốc quan trọng trong lịch sử hình thành và phát triển của Hùng Thủy.</p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-blue-200 hidden md:block" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100">
                      <div className="text-blue-700 font-bold text-sm mb-1">{m.year}</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{m.title}</h3>
                      <p className="text-gray-600 text-sm">{m.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-12 h-12 bg-blue-900 rounded-full items-center justify-center flex-shrink-0 z-10 shadow-lg">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Ban lãnh đạo</h2>
            <p className="text-gray-600">Đội ngũ lãnh đạo giàu kinh nghiệm, định hướng chiến lược phát triển bền vững.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-lg transition-all"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
                  {member.name.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{member.name}</h3>
                <div className="text-blue-700 text-sm font-semibold mb-2">{member.title}</div>
                <div className="text-gray-500 text-xs">{member.exp}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-200 rounded-full text-sm font-semibold mb-4">
              <Award className="w-4 h-4" />
              Chứng nhận & Giải thưởng
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Được công nhận bởi các tổ chức uy tín</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert, i) => (
              <motion.div
                key={cert}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 bg-white/10 rounded-xl p-4"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-white text-sm">{cert}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
