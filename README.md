# edapps-admin

# SMS License Admin

Next.js + Tailwind + Supabase. Deploy to Vercel. School app still uses SQLite on the laptop.

## Local

1. Create a [Supabase](https://supabase.com) project and run `supabase/schema.sql`.
2. Copy `.env.example` → `.env` / `.env.local`.
3. In Supabase go to **Settings → API Keys**:
   - Prefer **Secret key** (`sb_secret_...`) — this replaces legacy `service_role`
   - Or use **Legacy → service_role** (`eyJ...`) if you still have it
4. Put that value in `SUPABASE_SERVICE_ROLE_KEY` (full key, not truncated).
5. Set `ED25519_SEED` from `../sms-license/data/ed25519.sk`.
6. `pnpm install && pnpm dev` → http://localhost:3000/admin

## Vercel env

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...` (or legacy `service_role`)
- `ED25519_SEED`
- `ADMIN_PASSWORD`
- `PUBLIC_URL` = `https://edapps-admin.ahmerarain.com`

Nodemailer can be added later as a Next.js API route.
