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
    count(*) over() as total_count
  from notifications n
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
      select l.user_id
      from public.diary_likes l
      join public.diaries d
        on d.id = l.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and l.user_id <> current_user_id

      union all

      select c.user_id
      from public.diary_comments c
      join public.diaries d
        on d.id = c.diary_id
      where d.user_id = current_user_id
        and d.visibility = 'public'
        and c.user_id <> current_user_id
    )
    select count(*)
    from notifications
  );
end;
$$;

grant execute on function public.count_my_notifications() to authenticated;
