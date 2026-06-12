create or replace function enforce_user_quota()
returns trigger language plpgsql as $$
declare
  board_limit constant int := 100;
  card_limit  constant int := 2000;
begin
  perform pg_advisory_xact_lock(hashtext(new.owner_id::text)::bigint);
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

alter table cards
  add constraint fk_cards_board foreign key (board_id) references boards(id) on delete cascade;

alter table board_snapshots
  add constraint fk_snapshots_board foreign key (board_id) references boards(id) on delete cascade;

alter table shares
  add constraint fk_shares_board foreign key (board_id) references boards(id) on delete cascade;
