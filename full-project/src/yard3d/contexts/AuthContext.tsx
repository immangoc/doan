import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { JwtUser } from '../services/apiClient';

const AuthContext = createContext<JwtUser | null>(null);

/**
 * Reads user info from do-an-full's WarehouseAuthContext localStorage format
 * (ht_user JSON) and maps it to the JwtUser shape that yard3d components expect.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useMemo<JwtUser | null>(() => {
    try {
      const raw = localStorage.getItem('ht_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        username: parsed.name || parsed.username || 'User',
        role: (parsed.role || 'OPERATOR').toUpperCase(),
      };
    } catch {
      return null;
    }
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth(): JwtUser | null {
  return useContext(AuthContext);
}
