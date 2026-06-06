-- Soul Writer: Story Bible schema (Step 1)

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  synopsis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  name text not null,
  role text not null check (role in ('Protagonist', 'Antagonist', 'Supporting')),
  age integer,
  physical_appearance text,
  core_flaw text,
  primary_motivation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, name)
);

create index characters_story_id_idx on public.characters (story_id);
create index stories_user_id_idx on public.stories (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stories_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

create trigger characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

alter table public.stories enable row level security;
alter table public.characters enable row level security;

create policy "Users can view own stories"
  on public.stories for select
  using (auth.uid() = user_id);

create policy "Users can insert own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stories"
  on public.stories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

create policy "Users can view characters in own stories"
  on public.characters for select
  using (
    story_id in (
      select id from public.stories where user_id = auth.uid()
    )
  );

create policy "Users can insert characters in own stories"
  on public.characters for insert
  with check (
    story_id in (
      select id from public.stories where user_id = auth.uid()
    )
  );

create policy "Users can update characters in own stories"
  on public.characters for update
  using (
    story_id in (
      select id from public.stories where user_id = auth.uid()
    )
  )
  with check (
    story_id in (
      select id from public.stories where user_id = auth.uid()
    )
  );

create policy "Users can delete characters in own stories"
  on public.characters for delete
  using (
    story_id in (
      select id from public.stories where user_id = auth.uid()
    )
  );
