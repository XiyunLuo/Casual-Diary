alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profiles_updated_at();

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = p_user_id
  limit 1
$$;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;

create or replace function public.sync_profile_name_to_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.diaries
    set author_name = coalesce(new.display_name, split_part(new.email, '@', 1))
    where user_id = new.id;

    update public.diary_comments
    set author_name = coalesce(new.display_name, split_part(new.email, '@', 1))
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_name_to_content on public.profiles;

create trigger sync_profile_name_to_content
  after update of display_name on public.profiles
  for each row execute procedure public.sync_profile_name_to_content();
