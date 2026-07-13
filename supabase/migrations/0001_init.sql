-- Parable — payments-ready schema (STUBBED: nothing is gated at launch).
-- This models a future Pro tier. Every catalog item is `free` today, and the
-- app's canAccess() returns true for everything, so these tables are inert.
-- Apply with: supabase db push  (or the Supabase MCP apply_migration).

-- ── users ──────────────────────────────────────────────────────────────────
-- Mirrors auth.users; created on sign-up via a trigger in a real deployment.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique not null,
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  created_at  timestamptz not null default now()
);

-- ── entitlements ───────────────────────────────────────────────────────────
-- Which Pro catalog items a user owns. Empty for everyone at launch.
create table if not exists public.entitlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  item_slug   text not null,
  item_type   text not null check (item_type in ('component', 'template')),
  granted_at  timestamptz not null default now(),
  unique (user_id, item_slug)
);

create index if not exists entitlements_user_idx
  on public.entitlements (user_id);

-- ── row level security ───────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.entitlements enable row level security;

-- Users can read/update only their own row.
create policy "users read own"   on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- Users can read only their own entitlements. Writes happen server-side
-- (service role) after a future checkout — never from the client.
create policy "entitlements read own" on public.entitlements
  for select using (auth.uid() = user_id);

-- NOTE: catalog item tiers live in code (registry.json / lib/templates.ts),
-- not in the DB, so the marketplace stays statically deployable. The DB only
-- tracks *who owns what* once a Pro tier goes live.
