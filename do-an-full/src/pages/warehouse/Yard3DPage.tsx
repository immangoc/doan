import { useMemo } from 'react';
import { Warehouse3D } from '@yard3d/pages/Warehouse3D';
import { AuthProvider } from '@yard3d/contexts/AuthContext';
import { decodeJwtUser } from '@yard3d/services/apiClient';
import '@yard3d/i18n';

/**
 * Bridge do-an-full auth token (ht_token) into the 3D module token storage (token).
 * This keeps the 3D module working without rewriting its API client.
 */
export default function Yard3DPage() {
  const user = useMemo(() => {
    const ht = localStorage.getItem('ht_token');
    if (!ht) return null;
    return decodeJwtUser(ht);
  }, []);

  return (
    <AuthProvider user={user}>
      <Warehouse3D />
    </AuthProvider>
  );
}

