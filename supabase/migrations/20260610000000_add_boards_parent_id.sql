alter table boards
  add column if not exists parent_id uuid references boards(id) on delete set null;

create index if not exists boards_parent on boards(parent_id);
