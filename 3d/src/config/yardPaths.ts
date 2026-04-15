export const YARD_BASE = '/warehouse/yard';

export function yardPath(path: string): string {
  if (!path.startsWith('/')) return `${YARD_BASE}/${path}`;
  return `${YARD_BASE}${path}`;
}

