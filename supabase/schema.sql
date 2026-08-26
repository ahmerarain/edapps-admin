-- Run once in Supabase SQL editor (Dashboard → SQL → New query)

create table if not exists schools (
  id text primary key,
  school_code text not null unique,
  name text not null,
  contact text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists licenses (
  id text primary key,
  school_id text not null references schools(id),
  license_type text not null default 'subscription',
  status text not null default 'active',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_machines integer not null default 1,
  verification_interval_days integer not null default 29,
  offline_grace_days integer not null default 7,
  activation_pin text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists machines (
  id text primary key,
  license_id text not null references licenses(id),
  machine_id text not null,
  status text not null default 'active',
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (license_id, machine_id)
);

create index if not exists idx_licenses_school on licenses(school_id);
create index if not exists idx_machines_license on machines(license_id);

-- Existing databases: run this once in Supabase SQL editor
alter table licenses add column if not exists activation_pin text not null default '';
