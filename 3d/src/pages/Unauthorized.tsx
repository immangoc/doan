import { ShieldOff } from 'lucide-react';

export function Unauthorized() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1.5rem',
        background: '#0f1117',
        color: '#e5e7eb',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <ShieldOff size={56} color="#6c47ff" strokeWidth={1.5} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        Không có quyền truy cập
      </h1>
      <p style={{ color: '#9ca3af', maxWidth: 360, margin: 0 }}>
        Bạn cần đăng nhập từ hệ thống quản lý để truy cập trang này.
      </p>
      <a
        href="http://localhost:3000/warehouse/login"
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 1.5rem',
          background: '#6c47ff',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        Quay lại đăng nhập
      </a>
    </div>
  );
}
