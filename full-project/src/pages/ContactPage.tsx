import { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Anchor, MessageSquare } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const contactInfo = [
  {
    icon: MapPin,
    title: 'Địa chỉ trụ sở',
    lines: ['Số 26A Lê Thánh Tông', 'Phường Ngô Quyền, Hải Phòng', 'Việt Nam'],
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Phone,
    title: 'Điện thoại',
    lines: ['Hotline: 02253768278', 'VP: 0904156269'],
    color: 'bg-green-100 text-green-700',
  },
  {
    icon: Mail,
    title: 'Email',
    lines: ['vantai.hungthuy@gmail.com'],
    color: 'bg-orange-100 text-orange-700',
  },
  {
    icon: Clock,
    title: 'Giờ làm việc',
    lines: ['Thứ 2 - Thứ 6: 7:00 - 18:00', 'Thứ 7: 7:00 - 12:00', 'Chủ nhật: Nghỉ'],
    color: 'bg-purple-100 text-purple-700',
  },
];

const departments = [
  'Tư vấn dịch vụ logistics',
  'Báo giá vận chuyển',
  'Hỗ trợ kỹ thuật',
  'Khiếu nại & Phản ánh',
  'Hợp tác kinh doanh',
  'Khác',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', dept: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-900 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full" />
          <div className="absolute bottom-0 right-20 w-48 h-48 bg-white rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-200 rounded-full text-sm font-semibold mb-6">
              <MessageSquare className="w-4 h-4" />
              Liên hệ
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Liên hệ với chúng tôi</h1>
            <p className="text-blue-200 text-xl max-w-2xl mx-auto">
              Đội ngũ chuyên gia của Hùng Thủy luôn sẵn sàng tư vấn và hỗ trợ bạn 24/7.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8">
            {contactInfo.map((info, i) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
              >
                <div className={`w-12 h-12 ${info.color} rounded-xl flex items-center justify-center mb-4`}>
                  <info.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-3">{info.title}</h3>
                <div className="space-y-1">
                  {info.lines.map((line, j) => (
                    <div key={j} className="text-gray-600 text-sm">{line}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Map */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Gửi tin nhắn cho chúng tôi</h2>
              <p className="text-gray-600 mb-8">Điền vào form dưới đây, chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.</p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center"
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Gửi thành công!</h3>
                  <p className="text-gray-600 mb-6">Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi trong vòng 24 giờ làm việc.</p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', company: '', dept: '', message: '' }); }}
                    className="px-6 py-3 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
                  >
                    Gửi tin nhắn khác
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Nguyễn Văn A"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="email@example.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="0912 345 678"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Công ty</label>
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Tên công ty của bạn"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề liên hệ *</label>
                    <select
                      name="dept"
                      value={form.dept}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                    >
                      <option value="">-- Chọn chủ đề --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Mô tả chi tiết nhu cầu của bạn..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Gửi tin nhắn
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Map & Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Vị trí của chúng tôi</h2>
                <p className="text-gray-600 mb-6">Tọa lạc tại Hải Phòng, trung tâm logistics cảng biển miền Bắc.</p>
              </div>

              {/* Map Embed */}
              <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100 h-80">
                <iframe
                  title="Hùng Thủy Location"
                  src="https://www.google.com/maps?q=S%E1%BB%91%2026A%20L%C3%AA%20Th%C3%A1nh%20T%C3%B4ng%2C%20Ph%C6%B0%E1%BB%9Dng%20Ng%C3%B4%20Quy%E1%BB%87n%2C%20H%E1%BA%A3i%20Ph%C3%B2ng%2C%20Vi%E1%BB%87t%20Nam&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Quick Contact */}
              <div className="bg-blue-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Anchor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold">Hỗ trợ khẩn cấp 24/7</div>
                    <div className="text-blue-300 text-sm">Đội ngũ luôn sẵn sàng</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <a href="tel:02253768278" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3">
                    <Phone className="w-5 h-5 text-blue-300" />
                    <span className="font-semibold">02253768278</span>
                  </a>
                  <a href="tel:0904156269" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3">
                    <Phone className="w-5 h-5 text-blue-300" />
                    <span className="font-semibold">0904156269</span>
                  </a>
                  <a href="mailto:vantai.hungthuy@gmail.com" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3">
                    <Mail className="w-5 h-5 text-blue-300" />
                    <span className="font-semibold">vantai.hungthuy@gmail.com</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
