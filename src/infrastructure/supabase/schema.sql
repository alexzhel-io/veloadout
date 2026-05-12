-- Run this in Supabase SQL Editor
-- Idempotent: safe to run multiple times

-- Global gear catalog
create extension if not exists pg_trgm;

create table if not exists gear_items (
  id            text primary key,
  names_json    jsonb not null,
  aliases_json  jsonb not null default '[]'::jsonb,
  volume_liters numeric(6,2) not null,
  weight_grams  numeric(8,1),
  category      text not null,
  source_url    text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  variants_json jsonb not null default '[]'::jsonb,
  search_text   text generated always as (
    lower(
      (names_json::text) || ' ' || (aliases_json::text)
    )
  ) stored
);

create index if not exists idx_gear_items_category on gear_items(category);
create index if not exists idx_gear_items_search_gin on gear_items using gin (search_text gin_trgm_ops);

-- Backfill search_text for existing rows (no-op for generated column, just in case)
-- Generated columns update automatically on insert/update.

-- Drop old indexes that are superseded
drop index if exists idx_gear_items_names_gin;
drop index if exists idx_gear_items_aliases_gin;

alter table gear_items enable row level security;
drop policy if exists "Anyone can read gear items" on gear_items;
create policy "Anyone can read gear items"
  on gear_items for select using (true);
drop policy if exists "Authenticated users can insert gear items" on gear_items;
drop policy if exists "Anyone can insert gear items" on gear_items;
create policy "Anyone can insert gear items"
  on gear_items for insert with check (true);
drop policy if exists "Authenticated users can update gear items" on gear_items;
drop policy if exists "Anyone can update gear items" on gear_items;
create policy "Anyone can update gear items"
  on gear_items for update using (true);

-- User gear lists
create table if not exists gear_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My Gear List',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists gear_list_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references gear_lists(id) on delete cascade,
  name          text not null,
  category      text not null,
  volume_liters numeric(6,2) not null,
  weight_grams  numeric(8,1),
  quantity      int not null default 1,
  size_label    text,
  source        text not null default 'manual',
  source_url    text,
  created_at    timestamptz not null default now()
);

alter table gear_lists enable row level security;
alter table gear_list_items enable row level security;

drop policy if exists "Users see own lists" on gear_lists;
create policy "Users see own lists"
  on gear_lists for all using (auth.uid() = user_id);

drop policy if exists "Users see own list items" on gear_list_items;
create policy "Users see own list items"
  on gear_list_items for all
  using (list_id in (select id from gear_lists where user_id = auth.uid()));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists gear_lists_updated_at on gear_lists;
create trigger gear_lists_updated_at
  before update on gear_lists
  for each row execute function update_updated_at();
