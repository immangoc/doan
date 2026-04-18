import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import HungThuyLogo from '../../components/warehouse/HungThuyLogo';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';


export default function WarehouseLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const navigate = useNavigate();
  const { login } = useWarehouseAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email.trim(), password);
      const routes: Record<string, string> = {
        admin:    '/warehouse/admin/dashboard',
        planner:  '/warehouse/planner/dashboard',
        operator: '/warehouse/operator/dashboard',
        customer: '/warehouse/customer/dashboard',
      };
      navigate(routes[userData.role] || '/warehouse');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

      {/* Back to home */}
      <div className="fixed top-4 left-4 z-20">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/80 hover:text-white bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 transition-all hover:bg-white/20">
          <ArrowLeft className="w-4 h-4" /> Trang chủ
        </Link>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

        {/* ── LEFT: Branding ── */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}
          className="hidden lg:flex flex-col gap-6 text-white">
          <HungThuyLogo size="lg" showText variant="white" />
          <h1 className="text-4xl font-bold leading-tight">
            Hệ thống Quản lý<br />
            <span className="text-blue-400">Kho bãi Container</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Giải pháp toàn diện cho quản lý container, tối ưu hóa vận hành<br />
            cảng biển theo chuẩn quốc tế với công nghệ hiện đại.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[['1,000+','Container quản lý'],['99.9%','Độ chính xác'],['24/7','Vận hành liên tục'],['200+','Khách hàng tin dùng']].map(([v,l]) => (
              <div key={l} className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-xl font-bold text-blue-300">{v}</div>
                <div className="text-xs text-white/50">{l}</div>
              </div>
            ))}
          </div>
          <div className="relative h-44 rounded-2xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80"
              alt="Cảng container" className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 to-transparent" />
            <div className="absolute bottom-3 left-4 text-white">
              <div className="font-bold text-sm">Cảng biển Hùng Thủy</div>
              <div className="text-xs text-white/60">Vận hành 24/7 · Chuẩn quốc tế</div>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Login Card ── */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
          <Card className="shadow-2xl border-0 bg-white dark:bg-gray-900 overflow-hidden">
            {/* top accent */}
            <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-400 to-cyan-400" />

            <CardHeader className="pt-6 pb-3 px-6">
              <div className="lg:hidden flex justify-center mb-3">
                <HungThuyLogo size="md" showText variant="white" />
              </div>
              <div className="flex items-center gap-2 justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đăng nhập hệ thống</h2>
              </div>
              <p className="text-xs text-center text-gray-400 mt-1">
                Công ty Vận tải Cảng biển Hùng Thủy
              </p>
            </CardHeader>

            <CardContent className="px-6 pb-6 space-y-5">

              {/* Form đăng nhập */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="email" type="email" placeholder="email@hungthuy.com"
                      value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                      className="pl-9 h-11" required autoComplete="email" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="password" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                      className="pl-9 pr-10 h-11" required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 px-3 py-2.5 rounded-lg text-sm">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white font-semibold shadow-md text-sm">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang xác thực...</>
                    : <><LogIn className="w-4 h-4 mr-2" /> Đăng nhập</>}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Chưa có tài khoản?{' '}
                  <Link to="/warehouse/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                    Đăng ký ngay
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-white/30 mt-4">
            © 2025 Hùng Thủy Transport
          </p>
        </motion.div>
      </div>
    </div>
  );
}
