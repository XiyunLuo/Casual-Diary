create extension if not exists pgcrypto;

alter table public.diaries
  add column if not exists author_name text,
  add column if not exists likes_count integer not null default 0,
  add column if not exists comments_count integer not null default 0;

update public.diaries d
set author_name = coalesce(p.display_name, split_part(p.email, '@', 1))
from public.profiles p
where d.user_id = p.id
  and (d.author_name is null or d.author_name = '');

create or replace function public.sync_diary_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_name is null or new.author_name = '' then
    select coalesce(display_name, split_part(email, '@', 1))
      into new.author_name
    from public.profiles
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_diary_author_name on public.diaries;

create trigger sync_diary_author_name
  before insert or update on public.diaries
  for each row execute procedure public.sync_diary_author_name();

create table if not exists public.diary_likes (
  diary_id uuid not null references public.diaries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (diary_id, user_id)
);

alter table if exists public.diary_likes
  add column if not exists diary_id uuid references public.diaries (id) on delete cascade,
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

create index if not exists diary_likes_user_id_idx
  on public.diary_likes (user_id);

alter table public.diary_likes enable row level security;

create table if not exists public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table if exists public.diary_comments
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists diary_id uuid references public.diaries (id) on delete cascade,
  add column if not exists author_id uuid references auth.users (id) on delete cascade,
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists author_name text,
  add column if not exists content text,
  add column if not exists created_at timestamptz not null default now();

update public.diary_comments
set user_id = coalesce(user_id, author_id);

update public.diary_comments
set author_id = coalesce(author_id, user_id);

create index if not exists diary_comments_diary_created_idx
  on public.diary_comments (diary_id, created_at desc);

create index if not exists diary_comments_user_created_idx
  on public.diary_comments (user_id, created_at desc);

alter table public.diary_comments enable row level security;

create or replace function public.sync_comment_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := coalesce(new.user_id, new.author_id, auth.uid());
  new.author_id := coalesce(new.author_id, new.user_id, auth.uid());
  return new;
end;
$$;

drop trigger if exists sync_comment_user_columns on public.diary_comments;

create trigger sync_comment_user_columns
  before insert or update on public.diary_comments
  for each row execute procedure public.sync_comment_user_columns();

update public.diary_comments c
set author_name = coalesce(p.display_name, split_part(p.email, '@', 1))
from public.profiles p
where c.user_id = p.id
  and (c.author_name is null or c.author_name = '');

create or replace function public.sync_comment_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_name is null or new.author_name = '' then
    select coalesce(display_name, split_part(email, '@', 1))
      into new.author_name
    from public.profiles
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_comment_author_name on public.diary_comments;

create trigger sync_comment_author_name
  before insert or update on public.diary_comments
  for each row execute procedure public.sync_comment_author_name();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_likes'
      and policyname = 'Anyone can view likes'
  ) then
    create policy "Anyone can view likes"
      on public.diary_likes
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_likes'
      and policyname = 'Users can like public diaries'
  ) then
    create policy "Users can like public diaries"
      on public.diary_likes
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from public.diaries
          where id = diary_id
            and visibility = 'public'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_likes'
      and policyname = 'Users can unlike their likes'
  ) then
    create policy "Users can unlike their likes"
      on public.diary_likes
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_comments'
      and policyname = 'Anyone can view comments on public diaries'
  ) then
    create policy "Anyone can view comments on public diaries"
      on public.diary_comments
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.diaries
          where id = diary_id
            and visibility = 'public'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_comments'
      and policyname = 'Users can comment on public diaries'
  ) then
    create policy "Users can comment on public diaries"
      on public.diary_comments
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from public.diaries
          where id = diary_id
            and visibility = 'public'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'diary_comments'
      and policyname = 'Users can delete their own comments'
  ) then
    create policy "Users can delete their own comments"
      on public.diary_comments
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.refresh_diary_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_diary_id uuid;
begin
  target_diary_id := coalesce(new.diary_id, old.diary_id);

  update public.diaries
  set likes_count = (
    select count(*)
    from public.diary_likes
    where diary_id = target_diary_id
  )
  where id = target_diary_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_diary_like_count on public.diary_likes;

create trigger refresh_diary_like_count
  after insert or delete on public.diary_likes
  for each row execute procedure public.refresh_diary_like_count();

create or replace function public.refresh_diary_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_diary_id uuid;
begin
  target_diary_id := coalesce(new.diary_id, old.diary_id);

  update public.diaries
  set comments_count = (
    select count(*)
    from public.diary_comments
    where diary_id = target_diary_id
  )
  where id = target_diary_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_diary_comment_count on public.diary_comments;

create trigger refresh_diary_comment_count
  after insert or delete on public.diary_comments
  for each row execute procedure public.refresh_diary_comment_count();

update public.diaries d
set likes_count = (
  select count(*)
  from public.diary_likes l
  where l.diary_id = d.id
);

update public.diaries d
set comments_count = (
  select count(*)
  from public.diary_comments c
  where c.diary_id = d.id
);
