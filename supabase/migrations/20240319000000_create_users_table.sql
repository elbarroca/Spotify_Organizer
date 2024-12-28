-- Create a secure schema for our tables
create schema if not exists private;

-- Create users table
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  spotify_provider_token text,
  spotify_refresh_token text,
  spotify_token_expires_at timestamptz,
  spotify_id text,
  display_name text,
  avatar_url text,
  spotify_product text,
  spotify_country text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;

-- Create policies
create policy "Users can view own profile" 
on public.users 
for select 
using (auth.uid() = id);

create policy "Users can update own profile" 
on public.users 
for update 
using (auth.uid() = id);

create policy "Users can insert own profile" 
on public.users 
for insert 
with check (auth.uid() = id);

-- Create trigger for updating the updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at_column(); 