create table if not exists public.menu_banners (
  id uuid not null default gen_random_uuid(),
  store_id uuid not null,
  image_url text not null,
  duration integer not null default 5,
  "order" integer not null default 0,
  active boolean not null default true,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),
  constraint menu_banners_pkey primary key (id),
  constraint menu_banners_store_id_fkey
    foreign key (store_id) references public.stores (id) on delete cascade
);

create index if not exists idx_menu_banners_store_id
  on public.menu_banners using btree (store_id);

drop trigger if exists update_menu_banners_updated_at on public.menu_banners;
create trigger update_menu_banners_updated_at
before update on public.menu_banners
for each row
execute function update_updated_at_column();
