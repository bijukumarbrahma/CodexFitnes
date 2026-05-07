create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  bio text default '',
  height_cm numeric default 175,
  current_weight_kg numeric default 75,
  target_weight_kg numeric default 72,
  calorie_target integer default 2400,
  protein_target integer default 160,
  carb_target integer default 260,
  fat_target integer default 70,
  water_target_ml integer default 3000,
  streak integer default 0,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text default 'Strength',
  status text default 'planned',
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_min numeric default 0,
  calories_burned numeric default 0,
  exercises jsonb default '[]'::jsonb,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meals jsonb default '[]'::jsonb,
  water_ml integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.body_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  height_cm numeric not null,
  body_fat_percent numeric default 0,
  measurements jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'Consistency',
  target numeric not null default 100,
  current numeric default 0,
  unit text default '%',
  due_date date,
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps integer default 0,
  goal integer default 10000,
  distance_km numeric default 0,
  calories integer default 0,
  active_minutes integer default 0,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  caption text default '',
  date date not null,
  weight_kg numeric,
  visibility text default 'private',
  flagged boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.body_stats enable row level security;
alter table public.goals enable row level security;
alter table public.step_logs enable row level security;
alter table public.progress_photos enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own nutrition logs" on public.nutrition_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own body stats" on public.body_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own step logs" on public.step_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own progress photos" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
