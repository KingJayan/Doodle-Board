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

create or replace function enforce_user_quota()
returns trigger language plpgsql as $$
declare
  board_limit constant int := 100;
  card_limit  constant int := 2000;
begin
  if TG_TABLE_NAME = 'boards' then
    if (select count(*) from boards where owner_id = new.owner_id and not deleted) >= board_limit then
      raise exception 'quota exceeded: max % boards per user', board_limit;
    end if;
  elsif TG_TABLE_NAME = 'cards' then
    if (select count(*) from cards where owner_id = new.owner_id and not deleted) >= card_limit then
      raise exception 'quota exceeded: max % cards per user', card_limit;
    end if;
  end if;
  return new;
end;
$$;

create trigger boards_quota before insert on boards
  for each row execute function enforce_user_quota();

create trigger cards_quota before insert on cards
  for each row execute function enforce_user_quota();

-- M6: sharing

create table board_snapshots (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create table shares (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(24), 'base64url'),
  snapshot_id uuid references board_snapshots(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  expires_at  timestamptz
);

create index shares_token on shares(token);
create index shares_owner_board on shares(owner_id, board_id);

alter table board_snapshots enable row level security;
alter table shares           enable row level security;

create policy snapshots_owner on board_snapshots using (owner_id = auth.uid());
create policy shares_owner    on shares          using (owner_id = auth.uid());

create or replace function get_shared_board(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share shares%rowtype;
  v_payload jsonb;
begin
  select * into v_share
  from shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if not found then return null; end if;

  select payload into v_payload
  from board_snapshots
  where id = v_share.snapshot_id;

  return v_payload;
end;
$$;
