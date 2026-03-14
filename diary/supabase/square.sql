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

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null check (notification_type in ('like', 'comment')),
  diary_id uuid not null references public.diaries (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  notification_created_at timestamptz not null,
  comment_id uuid null references public.diary_comments (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_type, diary_id, actor_user_id, notification_created_at)
);

create index if not exists notification_reads_user_read_idx
  on public.notification_reads (user_id, read_at desc);

alter table public.notification_reads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_reads'
      and policyname = 'Users can view their own notification reads'
  ) then
    create policy "Users can view their own notification reads"
      on public.notification_reads
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_reads'
      and policyname = 'Users can insert their own notification reads'
  ) then
    create policy "Users can insert their own notification reads"
      on public.notification_reads
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_reads'
      and policyname = 'Users can delete their own notification reads'
  ) then
    create policy "Users can delete their own notification reads"
      on public.notification_reads
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

drop function if exists public.list_my_notifications(integer, integer);

create or replace function public.list_my_notifications(
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (
  notification_type text,
  actor_user_id uuid,
  actor_name text,
  actor_avatar_url text,
  created_at timestamptz,
  diary_id uuid,
  comment_id uuid,
  comment_preview text,
  is_unread boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := greatest(coalesce(p_page_size, 10), 1);
  safe_offset integer := (safe_page - 1) * safe_page_size;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with notifications as (
    select
      'like'::text as notification_type,
      l.user_id as actor_user_id,
      coalesce(p.display_name, split_part(p.email, '@', 1), '用户') as actor_name,
      p.avatar_url as actor_avatar_url,
      l.created_at,
      d.id as diary_id,
      null::uuid as comment_id,
      null::text as comment_preview
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    left join public.profiles p
      on p.id = l.user_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment'::text as notification_type,
      c.user_id as actor_user_id,
      coalesce(p.display_name, c.author_name, split_part(p.email, '@', 1), '用户') as actor_name,
      p.avatar_url as actor_avatar_url,
      c.created_at,
      d.id as diary_id,
      c.id as comment_id,
      case
        when char_length(c.content) > 10 then left(c.content, 10) || '...'
        else c.content
      end as comment_preview
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    left join public.profiles p
      on p.id = c.user_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    n.notification_type,
    n.actor_user_id,
    n.actor_name,
    n.actor_avatar_url,
    n.created_at,
    n.diary_id,
    n.comment_id,
    n.comment_preview,
    (nr.user_id is null) as is_unread,
    count(*) over() as total_count
  from notifications n
  left join public.notification_reads nr
    on nr.user_id = current_user_id
   and nr.notification_type = n.notification_type
   and nr.diary_id = n.diary_id
   and nr.actor_user_id = n.actor_user_id
   and nr.notification_created_at = n.created_at
  order by n.created_at desc
  limit safe_page_size
  offset safe_offset;
end;
$$;

grant execute on function public.list_my_notifications(integer, integer) to authenticated;

create or replace function public.count_my_notifications()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return (
    with notifications as (
      select
        'like'::text as notification_type,
        l.user_id as actor_user_id,
        l.created_at,
        d.id as diary_id
      from public.diary_likes l
      join public.diaries d
        on d.id = l.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and l.user_id <> current_user_id

      union all

      select
        'comment'::text as notification_type,
        c.user_id as actor_user_id,
        c.created_at,
        d.id as diary_id
      from public.diary_comments c
      join public.diaries d
        on d.id = c.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and c.user_id <> current_user_id
    )
    select count(*)
    from notifications n
    left join public.notification_reads nr
      on nr.user_id = current_user_id
     and nr.notification_type = n.notification_type
     and nr.diary_id = n.diary_id
     and nr.actor_user_id = n.actor_user_id
     and nr.notification_created_at = n.created_at
    where nr.user_id is null
  );
end;
$$;

grant execute on function public.count_my_notifications() to authenticated;

create or replace function public.mark_notification_read(
  p_notification_type text,
  p_diary_id uuid,
  p_actor_user_id uuid,
  p_notification_created_at timestamptz,
  p_comment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.notification_reads (
    user_id,
    notification_type,
    diary_id,
    actor_user_id,
    notification_created_at,
    comment_id
  )
  with notifications as (
    select
      'like'::text as notification_type,
      l.user_id as actor_user_id,
      l.created_at,
      d.id as diary_id,
      null::uuid as comment_id
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment'::text as notification_type,
      c.user_id as actor_user_id,
      c.created_at,
      d.id as diary_id,
      c.id as comment_id
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    current_user_id,
    n.notification_type,
    n.diary_id,
    n.actor_user_id,
    n.created_at,
    n.comment_id
  from notifications n
  where n.notification_type = p_notification_type
    and n.diary_id = p_diary_id
    and n.actor_user_id = p_actor_user_id
    and n.created_at = p_notification_created_at
    and n.comment_id is not distinct from p_comment_id
  on conflict do nothing;
end;
$$;

grant execute on function public.mark_notification_read(text, uuid, uuid, timestamptz, uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.notification_reads (
    user_id,
    notification_type,
    diary_id,
    actor_user_id,
    notification_created_at,
    comment_id
  )
  with notifications as (
    select
      'like'::text as notification_type,
      l.user_id as actor_user_id,
      l.created_at,
      d.id as diary_id,
      null::uuid as comment_id
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment'::text as notification_type,
      c.user_id as actor_user_id,
      c.created_at,
      d.id as diary_id,
      c.id as comment_id
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    current_user_id,
    n.notification_type,
    n.diary_id,
    n.actor_user_id,
    n.created_at,
    n.comment_id
  from notifications n
  on conflict do nothing;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

alter table public.notification_reads
  add column if not exists notification_key text;

update public.notification_reads
set notification_key = case
  when notification_type = 'comment' and comment_id is not null then 'comment:' || comment_id::text
  else 'like:' || diary_id::text || ':' || actor_user_id::text
end
where notification_key is null;

alter table public.notification_reads
  alter column notification_key set not null;

create unique index if not exists notification_reads_user_key_idx
  on public.notification_reads (user_id, notification_key);

drop function if exists public.list_my_notifications(integer, integer);

create or replace function public.list_my_notifications(
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (
  notification_key text,
  notification_type text,
  actor_user_id uuid,
  actor_name text,
  actor_avatar_url text,
  created_at timestamptz,
  diary_id uuid,
  comment_id uuid,
  comment_preview text,
  is_unread boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := greatest(coalesce(p_page_size, 10), 1);
  safe_offset integer := (safe_page - 1) * safe_page_size;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with notifications as (
    select
      'like:' || d.id::text || ':' || l.user_id::text as notification_key,
      'like'::text as notification_type,
      l.user_id as actor_user_id,
      coalesce(p.display_name, split_part(p.email, '@', 1), '用户') as actor_name,
      p.avatar_url as actor_avatar_url,
      l.created_at,
      d.id as diary_id,
      null::uuid as comment_id,
      null::text as comment_preview
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    left join public.profiles p
      on p.id = l.user_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment:' || c.id::text as notification_key,
      'comment'::text as notification_type,
      c.user_id as actor_user_id,
      coalesce(p.display_name, c.author_name, split_part(p.email, '@', 1), '用户') as actor_name,
      p.avatar_url as actor_avatar_url,
      c.created_at,
      d.id as diary_id,
      c.id as comment_id,
      case
        when char_length(c.content) > 10 then left(c.content, 10) || '...'
        else c.content
      end as comment_preview
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    left join public.profiles p
      on p.id = c.user_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    n.notification_key,
    n.notification_type,
    n.actor_user_id,
    n.actor_name,
    n.actor_avatar_url,
    n.created_at,
    n.diary_id,
    n.comment_id,
    n.comment_preview,
    (nr.user_id is null) as is_unread,
    count(*) over() as total_count
  from notifications n
  left join public.notification_reads nr
    on nr.user_id = current_user_id
   and nr.notification_key = n.notification_key
  order by n.created_at desc
  limit safe_page_size
  offset safe_offset;
end;
$$;

grant execute on function public.list_my_notifications(integer, integer) to authenticated;

create or replace function public.count_my_notifications()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return (
    with notifications as (
      select 'like:' || d.id::text || ':' || l.user_id::text as notification_key
      from public.diary_likes l
      join public.diaries d
        on d.id = l.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and l.user_id <> current_user_id

      union all

      select 'comment:' || c.id::text as notification_key
      from public.diary_comments c
      join public.diaries d
        on d.id = c.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and c.user_id <> current_user_id
    )
    select count(*)
    from notifications n
    left join public.notification_reads nr
      on nr.user_id = current_user_id
     and nr.notification_key = n.notification_key
    where nr.user_id is null
  );
end;
$$;

grant execute on function public.count_my_notifications() to authenticated;

create or replace function public.mark_notification_read(
  p_notification_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.notification_reads (
    user_id,
    notification_key,
    notification_type,
    diary_id,
    actor_user_id,
    notification_created_at,
    comment_id
  )
  with notifications as (
    select
      'like:' || d.id::text || ':' || l.user_id::text as notification_key,
      'like'::text as notification_type,
      d.id as diary_id,
      l.user_id as actor_user_id,
      l.created_at as notification_created_at,
      null::uuid as comment_id
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment:' || c.id::text as notification_key,
      'comment'::text as notification_type,
      d.id as diary_id,
      c.user_id as actor_user_id,
      c.created_at as notification_created_at,
      c.id as comment_id
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    current_user_id,
    n.notification_key,
    n.notification_type,
    n.diary_id,
    n.actor_user_id,
    n.notification_created_at,
    n.comment_id
  from notifications n
  where n.notification_key = p_notification_key
  on conflict (user_id, notification_key) do nothing;
end;
$$;

grant execute on function public.mark_notification_read(text) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.notification_reads (
    user_id,
    notification_key,
    notification_type,
    diary_id,
    actor_user_id,
    notification_created_at,
    comment_id
  )
  with notifications as (
    select
      'like:' || d.id::text || ':' || l.user_id::text as notification_key,
      'like'::text as notification_type,
      d.id as diary_id,
      l.user_id as actor_user_id,
      l.created_at as notification_created_at,
      null::uuid as comment_id
    from public.diary_likes l
    join public.diaries d
      on d.id = l.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and l.user_id <> current_user_id

    union all

    select
      'comment:' || c.id::text as notification_key,
      'comment'::text as notification_type,
      d.id as diary_id,
      c.user_id as actor_user_id,
      c.created_at as notification_created_at,
      c.id as comment_id
    from public.diary_comments c
    join public.diaries d
      on d.id = c.diary_id
    where d.user_id = current_user_id
      and d.visibility = 'public'
      and c.user_id <> current_user_id
  )
  select
    current_user_id,
    n.notification_key,
    n.notification_type,
    n.diary_id,
    n.actor_user_id,
    n.notification_created_at,
    n.comment_id
  from notifications n
  on conflict (user_id, notification_key) do nothing;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;
