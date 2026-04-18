import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Backend base URL ─────────────────────────────────────────────────────────
export const API_BASE = 'http://localhost:8080/api/v1';
export const API_SERVER_BASE = 'http://localhost:8080/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'planner' | 'operator' | 'customer';
  company?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  accessToken: string | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<AuthUser>;
  signup:  (data: SignupData) => Promise<void>;
  logout:  () => void;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  company?: string;
  phone?: string;
}

// ─── API helper ───────────────────────────────────────────────────────────────
export async function apiFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    // Token expired or invalidated — clear session and redirect to login
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_user');
    window.location.href = '/warehouse/login';
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'ht_token';
const USER_KEY  = 'ht_user';

export function WarehouseAuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session từ localStorage khi app load
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as AuthUser;
        setToken(savedToken);
        setUser(parsedUser);
      } catch {
        // Nếu localStorage bị hỏng thì xóa để user đăng nhập lại bình thường.
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // ── Đăng nhập — gọi Spring Boot backend ─────────────────────────────────
  const login = async (email: string, password: string): Promise<AuthUser> => {
    // Backend LoginRequest expects {email, password}
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Spring Boot returns ApiResponse<LoginResponse>:
    // { status, message, data: { token, expiresIn, userId, username, email, role } }
    const loginData = res.data;
    const newToken = loginData.token;

    const userData: AuthUser = {
      id:    String(loginData.userId),
      email: loginData.email,
      name:  loginData.username,
      role:  (loginData.role as string).toLowerCase() as AuthUser['role'],
    };

    setToken(newToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    return userData;
  };

  // ── Đăng ký ───────────────────────────────────────────────────────────────
  const signup = async (signupData: SignupData): Promise<void> => {
    // Backend RegisterRequest accepts { email, password, name (→fullName), phone }
    // username is auto-generated from email on the backend
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email:    signupData.email,
        password: signupData.password,
        name:     signupData.name,
        phone:    signupData.phone,
      }),
    });
  };

  // ── Đăng xuất ────────────────────────────────────────────────────────────
  const logout = () => {
    // Notify backend to blacklist the token (best-effort, no await)
    if (token) {
      apiFetch('/auth/logout', { method: 'POST' }, token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, accessToken: token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useWarehouseAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useWarehouseAuth must be used inside WarehouseAuthProvider');
  return ctx;
}

// Helper: lấy headers có token để gọi API
export function useAuthHeaders() {
  const { token } = useWarehouseAuth();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}