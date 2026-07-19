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
  parent_id uuid references public.notes (id) on delete cascade, -- nested pages
  position double precision not null default 0,                  -- sibling order
  type text not null default 'document', -- 'document' | 'grid' | 'board'
  title text not null default '',
  icon text not null default '📄',
  cover_url text,                   -- page cover image (Cloudinary)
  doc jsonb,                        -- BlockNote block content (documents)
  db jsonb,                         -- database content (grid/board pages)
  content text not null default '', -- legacy plain-text (kept for compatibility)
  image_url text,                   -- legacy cover (kept for compatibility)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade older installs that predate newer columns.
alter table public.notes add column if not exists icon text not null default '📄';
alter table public.notes add column if not exists doc jsonb;
alter table public.notes add column if not exists cover_url text;
alter table public.notes add column if not exists parent_id uuid references public.notes (id) on delete cascade;
alter table public.notes add column if not exists position double precision not null default 0;
alter table public.notes add column if not exists type text not null default 'document';
alter table public.notes add column if not exists db jsonb;
alter table public.notes alter column content drop not null;

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_parent_id_idx on public.notes (parent_id);
create index if not exists notes_position_idx on public.notes (position);
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
