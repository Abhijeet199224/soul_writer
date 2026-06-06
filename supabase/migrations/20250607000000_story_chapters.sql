-- Per-act chapter workspaces (Act = Chapter)

create table public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  act text not null,
  title text not null,
  sequence integer not null default 0,
  plot_beats jsonb not null default '[]'::jsonb,
  plot_objectives text not null default '',
  scene_beat text not null default '',
  draft_content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, act)
);

create index story_chapters_story_id_idx on public.story_chapters (story_id);
create index story_chapters_sequence_idx on public.story_chapters (story_id, sequence);

create trigger story_chapters_updated_at
  before update on public.story_chapters
  for each row execute function public.set_updated_at();

alter table public.story_chapters enable row level security;

create policy "Users can view chapters for own stories"
  on public.story_chapters for select
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can insert chapters for own stories"
  on public.story_chapters for insert
  with check (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can update chapters for own stories"
  on public.story_chapters for update
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  )
  with check (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can delete chapters for own stories"
  on public.story_chapters for delete
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

alter table public.story_workspace
  add column if not exists active_chapter_id uuid references public.story_chapters(id) on delete set null;
