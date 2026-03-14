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
