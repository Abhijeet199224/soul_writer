-- Story workspace: manuscript draft + bible notes (debounced auto-save target)

create table public.story_workspace (
  story_id uuid primary key references public.stories(id) on delete cascade,
  draft_content text not null default '',
  outline_json jsonb not null default '[]'::jsonb,
  setting_notes text not null default '',
  scene_beat text not null default '',
  slider_value integer not null default 50 check (slider_value >= 0 and slider_value <= 100),
  updated_at timestamptz not null default now()
);

create index story_workspace_updated_at_idx on public.story_workspace (updated_at);

create trigger story_workspace_updated_at
  before update on public.story_workspace
  for each row execute function public.set_updated_at();

alter table public.story_workspace enable row level security;

create policy "Users can view workspace for own stories"
  on public.story_workspace for select
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can insert workspace for own stories"
  on public.story_workspace for insert
  with check (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can update workspace for own stories"
  on public.story_workspace for update
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  )
  with check (
    story_id in (select id from public.stories where user_id = auth.uid())
  );

create policy "Users can delete workspace for own stories"
  on public.story_workspace for delete
  using (
    story_id in (select id from public.stories where user_id = auth.uid())
  );
