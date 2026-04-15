import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import {
  Ship, Package, BarChart3, Users, ArrowRight, CheckCircle2,
  Anchor, Globe2, Clock, Shield, TrendingUp, Award, ChevronRight,
  Container, Truck, FileText, Headphones
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import MainLayout from '../components/MainLayout';
import { newsArticles } from '../data/news';

// --- Animated Counter ---
function AnimatedCounter({ value, suffix = '', duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value, duration]);

  return <div ref={ref}>{count.toLocaleString()}{suffix}</div>;
}

const stats = [
  { icon: Package, value: 1000, suffix: '+', label: 'Container quản lý', color: 'text-blue-400' },
  { icon: Users, value: 200, suffix: '+', label: 'Khách hàng tin tưởng', color: 'text-green-400' },
  { icon: Ship, value: 15, suffix: '+', label: 'Năm kinh nghiệm', color: 'text-yellow-400' },
  { icon: Globe2, value: 10, suffix: '+ tuyến', label: 'Tuyến vận chuyển', color: 'text-purple-400' },
];

const services = [
  {
    icon: Container,
    title: 'Quản lý Container',
    desc: 'Hệ thống theo dõi, quản lý container thông minh với công nghệ số hóa hiện đại, cập nhật trạng thái thời gian thực 24/7.',
    color: 'bg-blue-50 text-blue-700',
    link: '/he-thong-quan-ly',
  },
  {
    icon: Ship,
    title: 'Vận tải biển',
    desc: 'Dịch vụ vận chuyển hàng hóa đường biển nội địa và quốc tế với đội tàu hiện đại, đảm bảo an toàn và đúng hạn.',
    color: 'bg-green-50 text-green-700',
    link: '/lien-he',
  },
  {
    icon: Truck,
    title: 'Logistics tích hợp',
    desc: 'Giải pháp logistics toàn diện từ điểm xuất phát đến điểm đích, tối ưu hóa chi phí và thời gian vận chuyển.',
    color: 'bg-purple-50 text-purple-700',
    link: '/lien-he',
  },
  {
    icon: FileText,
    title: 'Thủ tục Hải quan',
    desc: 'Hỗ trợ làm thủ tục hải quan nhanh chóng, đúng quy định pháp luật, giảm thiểu rủi ro và tiết kiệm thời gian.',
    color: 'bg-orange-50 text-orange-700',
    link: '/lien-he',
  },
  {
    icon: Package,
    title: 'Kho bãi Container',
    desc: 'Kho bãi đạt chuẩn quốc tế với diện tích lớn, hệ thống bảo mật và giám sát 24/7, đảm bảo hàng hóa an toàn.',
    color: 'bg-red-50 text-red-700',
    link: '/he-thong-quan-ly',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    desc: 'Đội ngũ chăm sóc khách hàng chuyên nghiệp, sẵn sàng hỗ trợ mọi thắc mắc và xử lý sự cố nhanh nhất.',
    color: 'bg-teal-50 text-teal-700',
    link: '/lien-he',
  },
];

const whyUs = [
  { icon: Shield, title: 'An toàn & Bảo mật', desc: 'Hệ thống giám sát 24/7, bảo hiểm hàng hóa toàn diện' },
  { icon: Clock, title: 'Đúng hạn tuyệt đối', desc: 'Cam kết giao hàng đúng thời gian, không trì hoãn' },
  { icon: TrendingUp, title: 'Tối ưu chi phí', desc: 'Giải pháp logistics tiết kiệm, minh bạch chi phí' },
  { icon: Award, title: 'Chất lượng hàng đầu', desc: 'Đạt các chứng chỉ ISO 9001:2015, ISO 14001' },
];

const newsItems = newsArticles.slice(0, 3);

const partners = [
  'Cảng Hải Phòng',
  'Cảng Đình Vũ',
  'Cảng Lạch Huyện',
  'Cảng Tân Vũ',
  'Cảng Nam Đình Vũ',
  'Cảng Cái Lân',
];

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1769144256181-698b8f807066?w=1920&q=80"
            alt="Container Port"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/80 to-blue-800/60" />
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-300/40 rounded-full"
              style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [-20, 20, -20], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px w-12 bg-blue-400" />
                <span className="text-blue-300 text-sm font-semibold uppercase tracking-widest">
                  Công ty Vận tải Cảng biển
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
                HÙNG THỦY
                <span className="block text-3xl lg:text-4xl font-normal text-blue-200 mt-2">
                  Vận tải & Logistics Cảng biển
                </span>
              </h1>

              <p className="text-lg text-blue-100 leading-relaxed mb-10 max-w-2xl">
                Đối tác hàng đầu Việt Nam với hơn 15 năm kinh nghiệm trong ngành vận tải biển và quản lý kho bãi container. Chúng tôi cam kết mang lại giải pháp toàn diện, an toàn và hiệu quả cho doanh nghiệp của bạn.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/he-thong-quan-ly"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transform"
                >
                  <BarChart3 className="w-5 h-5" />
                  Hệ thống quản lý
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/lien-he"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all"
                >
                  Liên hệ ngay
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                <div className={`text-4xl font-bold text-white mb-1`}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-blue-300 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              <Anchor className="w-4 h-4" />
              Dịch vụ của chúng tôi
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Giải pháp Logistics Toàn diện</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hùng Thủy cung cấp đầy đủ các dịch vụ logistics, từ quản lý kho bãi đến vận chuyển quốc tế, đáp ứng mọi nhu cầu của doanh nghiệp.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc, i) => (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-100"
              >
                <div className={`w-14 h-14 ${svc.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <svc.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{svc.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{svc.desc}</p>
                <Link
                  to={svc.link}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors group/link"
                >
                  Tìm hiểu thêm
                  <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us + Image */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                <Award className="w-4 h-4" />
                Tại sao chọn Hùng Thủy?
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Đối tác logistics đáng tin cậy của bạn
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Với hơn 15 năm kinh nghiệm trong ngành vận tải biển và quản lý kho bãi container, Hùng Thủy tự hào là đơn vị logistics hàng đầu tại Hải Phòng và vùng cảng biển miền Bắc.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {whyUs.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                      <div className="text-gray-500 text-sm">{item.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Link
                to="/gioi-thieu"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors"
              >
                Tìm hiểu về chúng tôi
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1763325088554-529181f76960?w=800&q=80"
                  alt="Container Yard"
                  className="w-full h-96 lg:h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
              </div>
              {/* Floating card */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-xl border border-gray-100"
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">99.9%</div>
                    <div className="text-sm text-gray-500">Độ chính xác</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute -top-6 -right-6 bg-blue-900 rounded-2xl p-5 shadow-xl"
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
              >
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-blue-300">Hỗ trợ liên tục</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                Tin tức & Sự kiện
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Tin tức mới nhất</h2>
            </motion.div>
            <Link to="/tin-tuc" className="hidden md:inline-flex items-center gap-1 text-blue-700 font-semibold hover:text-blue-900">
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newsItems.map((news, i) => (
              <motion.div
                key={news.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <ImageWithFallback
                    src={news.img}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-blue-900 text-white text-xs font-semibold rounded-full">
                      {news.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs text-gray-400 mb-2">{news.date}</div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {news.title}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-2">{news.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest">Đối tác hàng đầu Việt Nam</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {partners.map((p) => (
              <div key={p} className="bg-gray-50 rounded-xl px-4 py-5 text-center hover:bg-blue-50 transition-colors cursor-default">
                <span className="text-gray-600 text-sm font-semibold">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Sẵn sàng bắt đầu hợp tác?
            </h2>
            <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
              Liên hệ với chúng tôi để nhận tư vấn miễn phí và giải pháp logistics phù hợp nhất cho doanh nghiệp của bạn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/lien-he"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl"
              >
                Liên hệ ngay
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/warehouse/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-bold rounded-xl border border-white/30 hover:bg-white/20 transition-all"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
