import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, Eye, EyeOff, User, Building, Phone, UserPlus, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import HungThuyLogo from '../../components/warehouse/HungThuyLogo';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';

// step: 'form' → 'otp' → 'done'
type Step = 'form' | 'otp' | 'done';

export default function WarehouseRegister() {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', name: '', company: '', phone: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { signup } = useWarehouseAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Step 1: validate form and send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (formData.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi OTP');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Gửi OTP thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP then complete registration
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Vui lòng nhập mã OTP'); return; }
    setLoading(true);
    try {
      // Verify OTP
      const verifyRes = await fetch(`${API_BASE}/auth/verify-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || 'Mã OTP không đúng');

      // Register
      await signup({
        email: formData.email, password: formData.password,
        name: formData.name, company: formData.company, phone: formData.phone,
      });
      setSuccess(true);
      setStep('done');
      setTimeout(() => navigate('/warehouse/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = step === 'otp' ? handleVerifyAndRegister : handleSendOtp;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed top-4 left-4 z-20">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/80 hover:text-white bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 transition-all hover:bg-white/20">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

        {/* Left */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}
          className="hidden lg:flex flex-col gap-6 text-white">
          <HungThuyLogo size="lg" showText variant="white" />
          <h1 className="text-4xl font-bold leading-tight">
            Đăng ký tài khoản<br />
            <span className="text-blue-400">Quản lý Container</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Tạo tài khoản miễn phí để truy cập hệ thống quản lý kho bãi container tiên tiến của Hùng Thủy Transport.
          </p>
          <div className="bg-white/10 rounded-xl p-5 border border-white/10 space-y-3">
            <div className="font-semibold text-white">Lợi ích khi đăng ký:</div>
            {['Theo dõi container thời gian thực', 'Quản lý lịch trình xuất nhập khẩu', 'Báo cáo và phân tích chi tiết', 'Hỗ trợ 24/7 từ đội ngũ chuyên nghiệp'].map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-white/80">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                {b}
              </div>
            ))}
          </div>
          <div className="relative h-44 rounded-2xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80"
              alt="Container Port" className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 to-transparent" />
            <div className="absolute bottom-3 left-4 text-white">
              <div className="font-bold text-sm">Công nghệ quản lý hiện đại</div>
              <div className="text-xs text-white/60">Tối ưu hóa mọi quy trình vận hành</div>
            </div>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
          <Card className="shadow-2xl border-0 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-400 to-cyan-400" />
            <CardHeader className="pt-6 pb-3 px-6">
              <div className="lg:hidden flex justify-center mb-3"><HungThuyLogo size="md" showText variant="white" /></div>
              <CardTitle className="text-xl font-bold text-center">Tạo tài khoản mới</CardTitle>
              <p className="text-xs text-center text-gray-400 mt-1">Đăng ký để truy cập hệ thống quản lý</p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {step === 'done' ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đăng ký thành công!</h3>
                    <p className="text-gray-500 text-sm">Tài khoản đã được tạo. Đang chuyển về trang đăng nhập...</p>
                  </div>
                </motion.div>
              ) : step === 'otp' ? (
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  <div className="text-center py-3">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <KeyRound className="w-7 h-7 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Mã xác thực đã được gửi tới <strong>{formData.email}</strong>.
                      Vui lòng kiểm tra hộp thư và nhập mã bên dưới.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-sm font-medium">Mã OTP <span className="text-red-500">*</span></Label>
                    <Input
                      id="otp" type="text" maxLength={6} placeholder="Nhập 6 chữ số"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      className="h-11 text-center text-lg tracking-widest font-mono" required
                    />
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg text-sm border border-red-200">
                      {error}
                    </motion.div>
                  )}
                  <Button type="submit" disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white font-semibold shadow-md">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang xác thực...</>
                      : <><CheckCircle className="w-4 h-4 mr-2" /> Xác nhận & Hoàn tất đăng ký</>}
                  </Button>
                  <button type="button" onClick={() => { setStep('form'); setError(''); setOtp(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
                    ← Quay lại nhập thông tin
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-medium">Họ và tên <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input id="name" name="name" type="text" placeholder="Nguyễn Văn A"
                        value={formData.name} onChange={handleChange} className="pl-9 h-11" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input id="email" name="email" type="email" placeholder="example@company.com"
                        value={formData.email} onChange={handleChange} className="pl-9 h-11" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-sm font-medium">Công ty</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input id="company" name="company" type="text" placeholder="Tên công ty"
                          value={formData.company} onChange={handleChange} className="pl-9 h-11" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-medium">Điện thoại</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input id="phone" name="phone" type="tel" placeholder="0901234567"
                          value={formData.phone} onChange={handleChange} className="pl-9 h-11" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Mật khẩu <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Ít nhất 6 ký tự"
                        value={formData.password} onChange={handleChange} className="pl-9 pr-10 h-11" required />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Xác nhận mật khẩu <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword} onChange={handleChange} className="pl-9 pr-10 h-11" required />
                      <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg text-sm border border-red-200">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="rounded border-gray-300 mt-0.5 accent-blue-600" required />
                    <span className="text-gray-500 text-xs">
                      Tôi đồng ý với <a href="#" className="text-blue-600 hover:underline">Điều khoản dịch vụ</a> và <a href="#" className="text-blue-600 hover:underline">Chính sách bảo mật</a>
                    </span>
                  </div>

                  <Button type="submit" disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white font-semibold shadow-md">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang gửi OTP...</>
                      : <><UserPlus className="w-4 h-4 mr-2" /> Tiếp tục — Gửi mã xác thực</>}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Đã có tài khoản?{' '}
                    <Link to="/warehouse/login" className="text-blue-600 hover:underline font-semibold">Đăng nhập ngay</Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="text-center text-xs text-white/30 mt-4">© 2025 Hùng Thủy Transport · Tất cả quyền được bảo lưu</p>
        </motion.div>
      </div>
    </div>
  );
}
