import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { JwtUser } from '../services/apiClient';

const AuthContext = createContext<JwtUser | null>(null);

export function AuthProvider({ user, children }: { user: JwtUser | null; children: ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth(): JwtUser | null {
  return useContext(AuthContext);
}
