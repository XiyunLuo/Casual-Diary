create extension if not exists pgcrypto;

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diaries
  alter column user_id set default auth.uid();

create index if not exists diaries_user_id_updated_at_idx
  on public.diaries (user_id, updated_at desc);

create index if not exists diaries_public_updated_at_idx
  on public.diaries (visibility, updated_at desc);

alter table public.diaries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diaries'
      and policyname = 'Users can view their own diaries'
  ) then
    create policy "Users can view their own diaries"
      on public.diaries
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diaries'
      and policyname = 'Users can insert their own diaries'
  ) then
    create policy "Users can insert their own diaries"
      on public.diaries
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diaries'
      and policyname = 'Users can update their own diaries'
  ) then
    create policy "Users can update their own diaries"
      on public.diaries
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diaries'
      and policyname = 'Users can delete their own diaries'
  ) then
    create policy "Users can delete their own diaries"
      on public.diaries
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diaries'
      and policyname = 'Anyone can view public diaries'
  ) then
    create policy "Anyone can view public diaries"
      on public.diaries
      for select
      to anon, authenticated
      using (visibility = 'public');
  end if;
end $$;

create or replace function public.set_diaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_diaries_updated_at on public.diaries;

create trigger set_diaries_updated_at
  before update on public.diaries
  for each row execute procedure public.set_diaries_updated_at();
