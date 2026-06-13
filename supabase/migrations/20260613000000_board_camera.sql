alter table boards
  add column if not exists camera_x     float,
  add column if not exists camera_y     float,
  add column if not exists camera_zoom  float;
