import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import MainLayout from '../components/MainLayout';
import { newsArticles } from '../data/news';

export default function NewsDetailPage() {
  const params = useParams();
  const newsId = Number(params.newsId);
  const article = newsArticles.find((item) => item.id === newsId);

  if (!article) {
    return (
      <MainLayout>
        <section className="pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-blue-900 text-sm font-semibold uppercase tracking-[0.2em] mb-4">Tin tức</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Tin không tồn tại</h1>
            <p className="text-gray-600 mb-8">Không tìm thấy bài viết bạn đang tìm. Vui lòng quay lại trang tin tức để xem các bản tin khác.</p>
            <Link to="/tin-tuc" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Quay lại Tin tức
            </Link>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="pt-32 pb-10 bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              to="/tin-tuc"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Trở lại Tin tức
            </Link>
            <div className="bg-white/5 rounded-3xl p-8 shadow-2xl border border-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/80 text-sm font-semibold text-white">
                    <Tag className="w-4 h-4" /> {article.category}
                  </span>
                </div>
                <div className="text-sm text-blue-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {article.date}
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{article.title}</h1>
              <p className="text-blue-100 text-lg leading-relaxed max-w-3xl mb-8">{article.desc}</p>
              <div className="rounded-3xl overflow-hidden shadow-xl mb-10">
                <ImageWithFallback src={article.img} alt={article.title} className="w-full h-96 object-cover" />
              </div>
              <div className="prose prose-invert prose-lg max-w-none text-white">
                <p>{article.content}</p>
                <p>
                  Hùng Thủy tiếp tục phát triển các giải pháp logistics nhằm tối ưu hoá chuỗi cung ứng, rút ngắn thời gian giao nhận và tăng độ tin cậy cho khách hàng trong nước và xuất nhập khẩu.
                </p>
                <p>
                  Theo dõi thêm các tin tức khác tại trang <Link to="/tin-tuc" className="text-blue-200 hover:text-white">Tin tức Hùng Thủy</Link> để cập nhật nhanh nhất về dịch vụ, hoạt động và chính sách mới nhất của công ty.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
