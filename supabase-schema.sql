create table if not exists public.submissions (
  id text primary key,
  created_at bigint not null,
  student_name text not null,
  grade text not null,
  school text not null,
  teachers jsonb not null default '[]'::jsonb,
  story text,
  consent boolean not null default false,
  drive_status text,
  video jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create table if not exists public.site_options (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.submissions enable row level security;
alter table public.site_options enable row level security;

-- The website server uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
