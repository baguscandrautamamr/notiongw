-- ============================================================
-- BagusNote — Supabase schema
-- Run this in the Supabase Dashboard → SQL Editor.
-- Safe to run multiple times (idempotent). If you ran an older
-- version before, the ALTERs below upgrade your table in place.
-- ============================================================

-- ---------- Notes (pages) ----------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  icon text not null default '📄',
  doc jsonb,                        -- BlockNote block content
  content text not null default '', -- legacy plain-text (kept for compatibility)
  image_url text,                   -- legacy cover (kept for compatibility)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade older installs that predate the icon / doc columns.
alter table public.notes add column if not exists icon text not null default '📄';
alter table public.notes add column if not exists doc jsonb;
alter table public.notes alter column content drop not null;

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes are viewable by owner" on public.notes;
create policy "notes are viewable by owner"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "notes are insertable by owner" on public.notes;
create policy "notes are insertable by owner"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "notes are updatable by owner" on public.notes;
create policy "notes are updatable by owner"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notes are deletable by owner" on public.notes;
create policy "notes are deletable by owner"
  on public.notes for delete
  using (auth.uid() = user_id);

-- ---------- Push subscriptions ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "subs are viewable by owner" on public.push_subscriptions;
create policy "subs are viewable by owner"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subs are insertable by owner" on public.push_subscriptions;
create policy "subs are insertable by owner"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "subs are updatable by owner" on public.push_subscriptions;
create policy "subs are updatable by owner"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "subs are deletable by owner" on public.push_subscriptions;
create policy "subs are deletable by owner"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
