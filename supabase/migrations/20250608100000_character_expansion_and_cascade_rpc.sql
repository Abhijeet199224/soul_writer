-- Character profile expansion + transactional cascade RPC

alter table public.characters
  add column if not exists aliases text,
  add column if not exists voice_notes text,
  add column if not exists relationships jsonb default '[]'::jsonb;

create or replace function public.cascade_story_chapter_drafts(
  p_story_id uuid,
  p_updates jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec record;
  updated_count int := 0;
begin
  if not exists (
    select 1 from public.stories s
    where s.id = p_story_id
  ) then
    raise exception 'Story not found';
  end if;

  for rec in
    select *
    from jsonb_to_recordset(p_updates) as x(id uuid, draft_content text)
  loop
    update public.story_chapters sc
    set
      draft_content = rec.draft_content,
      updated_at = now()
    where sc.id = rec.id
      and sc.story_id = p_story_id;

    if found then
      updated_count := updated_count + 1;
    end if;
  end loop;

  return jsonb_build_object('updated', updated_count);
end;
$$;

grant execute on function public.cascade_story_chapter_drafts(uuid, jsonb) to authenticated;
