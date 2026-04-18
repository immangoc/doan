# Supabase Migrations (ported from `warehouse-service`)

These SQL files are 1:1 copies of the Spring Boot Flyway migrations
(`warehouse-service/src/main/resources/db/migration/`). They use standard
PostgreSQL syntax and run on Supabase's Postgres without modification.

## How to apply

### Option A — Supabase SQL Editor (1 lần)
Mở Supabase dashboard → SQL Editor → chạy lần lượt từ `V1` → `V21`
(bỏ qua `V4` và `V15` — bản gốc đã skip).

### Option B — Supabase CLI
```bash
supabase db push
```
(Cần đặt các file vào `supabase/migrations/` ở root — có thể symlink:
`ln -s src/supabase/migrations supabase/migrations`).

## Notes
- `gen_random_uuid()` ở V21 cần extension `pgcrypto` — Supabase bật sẵn.
- V2 / V5 chứa seed data (roles, permissions, fee_config, demo users).
- V21 thêm `wallets`, `payments`, `wallet_transactions`, `withdraw_requests` cho PayOS flow.
