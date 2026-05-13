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
  variants_json jsonb not null default '[]'::jsonb
);

-- Add search_text column if not exists (migration-safe)
alter table gear_items add column if not exists search_text text;

-- Populate search_text for all existing rows
update gear_items
set search_text = lower((names_json::text) || ' ' || (aliases_json::text))
where search_text is null or search_text = '';

-- Trigger to keep search_text in sync on insert/update
create or replace function gear_items_update_search_text()
returns trigger as $$
begin
  new.search_text := lower((new.names_json::text) || ' ' || (new.aliases_json::text));
  return new;
end;
$$ language plpgsql;

drop trigger if exists gear_items_search_text_trigger on gear_items;
create trigger gear_items_search_text_trigger
  before insert or update on gear_items
  for each row execute function gear_items_update_search_text();

-- Indexes
create index if not exists idx_gear_items_category on gear_items(category);
drop index if exists idx_gear_items_names_gin;
drop index if exists idx_gear_items_aliases_gin;
create index if not exists idx_gear_items_search_gin on gear_items using gin (search_text gin_trgm_ops);

-- RLS
alter table gear_items enable row level security;
drop policy if exists "Anyone can read gear items" on gear_items;
create policy "Anyone can read gear items"
  on gear_items for select using (true);
drop policy if exists "Authenticated users can insert gear items" on gear_items;
drop policy if exists "Anyone can insert gear items" on gear_items;
create policy "Authenticated can insert gear items"
  on gear_items for insert with check (auth.uid() is not null);
drop policy if exists "Authenticated users can update gear items" on gear_items;
drop policy if exists "Anyone can update gear items" on gear_items;
create policy "Authenticated can update gear items"
  on gear_items for update using (auth.uid() is not null) with check (auth.uid() is not null);

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

-- Auto-update updated_at on gear_lists
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists gear_lists_updated_at on gear_lists;
create trigger gear_lists_updated_at
  before update on gear_lists
  for each row execute function update_updated_at();

-- Atomic list replacement: delete old items, insert new ones, bump updated_at.
-- Runs inside a single Postgres transaction so a partial failure rolls back.
-- security invoker: respects RLS, so users can only replace their own lists.
create or replace function replace_gear_list_items(p_list_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  delete from gear_list_items where list_id = p_list_id;
  if p_items is not null and jsonb_array_length(p_items) > 0 then
    insert into gear_list_items (list_id, name, category, volume_liters, weight_grams, quantity, size_label, source, source_url)
    select
      p_list_id,
      x->>'name',
      x->>'category',
      (x->>'volume_liters')::numeric,
      nullif(x->>'weight_grams', '')::numeric,
      (x->>'quantity')::int,
      nullif(x->>'size_label', ''),
      x->>'source',
      nullif(x->>'source_url', '')
    from jsonb_array_elements(p_items) x;
  end if;
  update gear_lists set updated_at = now() where id = p_list_id;
end;
$$;
