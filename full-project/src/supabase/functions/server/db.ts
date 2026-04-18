// Postgres client cho Supabase Edge Function
// Dùng để truy vấn các bảng đã chạy migration ở src/supabase/migrations/V*.sql
import postgres from 'npm:postgres@3.4.4';

const DB_URL =
  Deno.env.get('SUPABASE_DB_URL') ??
  Deno.env.get('DATABASE_URL') ??
  '';

let _sql: ReturnType<typeof postgres> | null = null;

export function sql() {
  if (!_sql) {
    if (!DB_URL) {
      throw new Error(
        'Postgres connection string không có. Set SUPABASE_DB_URL hoặc DATABASE_URL trong env của Edge Function.'
      );
    }
    _sql = postgres(DB_URL, {
      prepare: false, // Supabase pooler (PgBouncer) không hỗ trợ prepared statements
      max: 5,
      idle_timeout: 20,
    });
  }
  return _sql;
}

// Utility: chạy callback trong transaction
export async function tx<T>(fn: (sql: any) => Promise<T>): Promise<T> {
  return await sql().begin(fn) as T;
}
