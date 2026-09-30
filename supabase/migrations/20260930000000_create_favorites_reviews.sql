-- DB-01: TMDB is the catalog. Store only a user's media identity and review data.
-- Site administrators are assigned only through trusted database administration.
create schema app_private;
revoke all on schema app_private from public;

create table app_private.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function app_private.is_site_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from app_private.site_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on app_private.site_admins from anon, authenticated;
revoke execute on function app_private.is_site_admin() from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_site_admin() to authenticated;

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id bigint not null check (tmdb_id > 0),
  created_at timestamptz not null default now(),
  constraint favorites_pkey primary key (user_id, media_type, tmdb_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id bigint not null check (tmdb_id > 0),
  rating smallint not null check (rating between 1 and 10),
  body text not null check (char_length(body) between 1 and 2000 and char_length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_user_title unique (user_id, media_type, tmdb_id)
);

-- Public review lists filter by the actual TMDB identity, then paginate by creation time.
create index reviews_media_created_idx
  on public.reviews (media_type, tmdb_id, created_at desc, id desc);

create function public.set_review_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_updated_at
before update on public.reviews
for each row execute function public.set_review_updated_at();

-- Grants permit a request to reach RLS. Policies below decide which rows it may use.
revoke all on public.favorites from anon, authenticated;
revoke all on public.reviews from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (user_id, media_type, tmdb_id) on public.favorites to authenticated;
grant select on public.reviews to anon;
grant select, delete on public.reviews to authenticated;
grant insert (user_id, media_type, tmdb_id, rating, body) on public.reviews to authenticated;
grant update (rating, body) on public.reviews to authenticated;

alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

create policy favorites_read_own on public.favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy favorites_delete_own on public.favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Reviews are public to read; authors can edit their own rows.
create policy reviews_read_public on public.reviews
  for select to anon, authenticated
  using (true);

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy reviews_update_own on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reviews_delete_own_or_admin on public.reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id or (select app_private.is_site_admin()));
