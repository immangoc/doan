import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Tag, ArrowRight, Newspaper } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import MainLayout from '../components/MainLayout';
import { newsArticles } from '../data/news';

const categories = ['Tất cả', 'Thông báo', 'Sự kiện', 'Tin tức ngành', 'Giải thưởng', 'Công nghệ', 'Quản lý kho'];
const pageSize = 9;

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  const filtered = newsArticles.filter((news) => {
    const matchCat = activeCategory === 'Tất cả' || news.category === activeCategory;
    const searchText = search.trim().toLowerCase();
    const matchSearch = !searchText || news.title.toLowerCase().includes(searchText) || news.desc.toLowerCase().includes(searchText) || news.content.toLowerCase().includes(searchText);
    return matchCat && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedNews = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const featured = pagedNews.filter((news) => news.featured);
  const regular = pagedNews.filter((news) => !news.featured);

  return (
    <MainLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-200 rounded-full text-sm font-semibold mb-6">
              <Newspaper className="w-4 h-4" />
              Tin tức & Sự kiện
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Tin tức Hùng Thủy</h1>
            <p className="text-blue-200 text-xl max-w-2xl mx-auto">
              Cập nhật thông tin mới nhất về hoạt động, sự kiện và tin tức ngành logistics của chúng tôi.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-100 sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-blue-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm tin tức..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured */}
          {featured.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-900 rounded-full" />
                Tin nổi bật
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featured.map((news, i) => (
                  <Link key={news.id} to={`/tin-tuc/${news.id}`} className="group">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <ImageWithFallback
                          src={news.img}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="px-3 py-1 bg-blue-900 text-white text-xs font-semibold rounded-full">
                            {news.category}
                          </span>
                          <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full">
                            Nổi bật
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          {news.date}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">
                          {news.title}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{news.desc}</p>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                          Đọc thêm <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Regular News */}
          {regular.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full" />
                Tin tức khác
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regular.map((news, i) => (
                  <Link key={news.id} to={`/tin-tuc/${news.id}`} className="group">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <ImageWithFallback
                          src={news.img}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-900 text-xs font-semibold rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {news.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {news.date}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                          {news.title}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-3">{news.desc}</p>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                          Đọc thêm <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Newspaper className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Không tìm thấy tin tức phù hợp</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Hiển thị {pagedNews.length} / {filtered.length} tin tức
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 disabled:opacity-50"
                >
                  Trước
                </button>
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-4 py-2 rounded-xl text-sm border ${
                      currentPage === index + 1
                        ? 'bg-blue-900 text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 disabled:opacity-50"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
