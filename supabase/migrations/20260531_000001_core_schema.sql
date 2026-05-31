create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  personal_email text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  must_change_password boolean not null default false
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.instagram_posts (
  id text primary key,
  post_id text not null unique,
  account_id text,
  username text,
  account_name text,
  description text,
  duration integer,
  published_at timestamptz,
  permalink text,
  post_type text,
  views integer,
  reach integer,
  likes integer,
  shares integer,
  follows integer,
  comments integer,
  saves integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.meta_sync_config (
  id text primary key,
  instagram_user_id text,
  access_token text,
  enabled boolean not null default false,
  sync_interval_minutes integer not null default 60,
  last_synced_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_internal_messages_sender_id on public.internal_messages(sender_id);
create index if not exists idx_internal_messages_recipient_id on public.internal_messages(recipient_id);
create index if not exists idx_instagram_posts_published_at on public.instagram_posts(published_at desc);
