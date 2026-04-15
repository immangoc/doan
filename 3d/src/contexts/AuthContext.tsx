import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { JwtUser } from '../services/apiClient';
import { decodeJwtUser, getToken } from '../services/apiClient';

const AuthContext = createContext<JwtUser | null>(null);

export function AuthProvider({ user, children }: { user: JwtUser | null; children: ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ht_token') setTick((t) => t + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resolved = useMemo(() => {
    const t = getToken();
    return t ? decodeJwtUser(t) : null;
  }, [tick, user]);

  return <AuthContext.Provider value={resolved ?? user}>{children}</AuthContext.Provider>;
}

export function useAuth(): JwtUser | null {
  return useContext(AuthContext);
}
