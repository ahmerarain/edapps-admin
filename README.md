# edapps-admin

# SMS License Admin

Next.js + Tailwind + Supabase. Deploy to Vercel. School app still uses SQLite on the laptop.

## Local

1. Create a [Supabase](https://supabase.com) project and run `supabase/schema.sql`.
2. Copy `.env.example` → `.env.local` (use `ED25519_SEED` from `../sms-license/data/ed25519.sk`).
3. `pnpm install && pnpm dev` → http://localhost:3000/admin

## Vercel env

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ED25519_SEED`
- `ADMIN_PASSWORD`
- `PUBLIC_URL` = your `https://….vercel.app`

Nodemailer can be added later as a Next.js API route.
