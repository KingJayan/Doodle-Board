create table boards (
  id          uuid primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

create table cards (
  id           uuid primary key,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  board_id     uuid not null,
  title        text not null default '',
  content      text not null default '',
  tags         text[] not null default '{}',
  color        text not null,
  rotation     float not null default 0,
  stickers     text[] not null default '{}',
  is_pinned    boolean not null default false,
  is_minimized boolean not null default false,
  position     text not null,
  width        float,
  height       float,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);

create index boards_owner_updated on boards(owner_id, updated_at);
create index cards_owner_updated on cards(owner_id, updated_at);
create index cards_board on cards(board_id);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger boards_touch before update on boards
  for each row execute function touch_updated_at();

create trigger cards_touch before update on cards
  for each row execute function touch_updated_at();

alter table boards enable row level security;
alter table cards  enable row level security;

create policy boards_owner on boards using (owner_id = auth.uid());
create policy cards_owner  on cards  using (owner_id = auth.uid());
