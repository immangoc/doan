/**
 * Damage reporting service.
 *
 * reportDamage(): PUT /admin/containers/{containerId}/damage
 *   → marks the container as DAMAGED, then refreshes the 3D occupancy grid.
 */
import { apiFetch } from './apiClient';
import { refreshOccupancy } from './gateInService';

/**
 * PUT /admin/containers/{containerId}/damage
 * On success, refreshes the 3D occupancy grid.
 */
export async function reportDamage(containerId: string): Promise<void> {
  const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerId)}/damage`, {
    method: 'PUT',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Báo hỏng thất bại (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  await refreshOccupancy();
}
