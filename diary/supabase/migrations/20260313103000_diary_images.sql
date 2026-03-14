alter table public.diaries
  add column if not exists image_urls text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'diary-images'
  ) then
    insert into storage.buckets (id, name, public)
    values ('diary-images', 'diary-images', true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can view diary images'
  ) then
    create policy "Public can view diary images"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'diary-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their diary images'
  ) then
    create policy "Users can upload their diary images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'diary-images'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their diary images'
  ) then
    create policy "Users can update their diary images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'diary-images'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'diary-images'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their diary images'
  ) then
    create policy "Users can delete their diary images"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'diary-images'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;
