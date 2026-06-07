-- Add pronouns to character profiles for Smart Codex + manuscript cascade sync

alter table public.characters
  add column if not exists pronouns text;
