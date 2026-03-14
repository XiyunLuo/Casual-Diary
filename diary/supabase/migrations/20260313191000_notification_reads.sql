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
