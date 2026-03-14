create or replace function public.set_diaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.title,
    new.content,
    new.visibility,
    new.image_urls
  ) is distinct from row(
    old.title,
    old.content,
    old.visibility,
    old.image_urls
  ) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;

  return new;
end;
$$;
