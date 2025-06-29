create table redirects (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references sites(id) on delete cascade not null,
  source text not null,
  destination text not null,
  created_at timestamptz default now() not null
);

alter table redirects enable row level security;

create policy "Users can view redirects for their sites"
on redirects for select
using ( auth.uid() in (
  select user_id from sites_users where site_id = redirects.site_id
));

create policy "Users can create redirects for their sites"
on redirects for insert
with check ( auth.uid() in (
  select user_id from sites_users where site_id = redirects.site_id
));

create policy "Users can update redirects for their sites"
on redirects for update
using ( auth.uid() in (
  select user_id from sites_users where site_id = redirects.site_id
));

create policy "Users can delete redirects for their sites"
on redirects for delete
using ( auth.uid() in (
  select user_id from sites_users where site_id = redirects.site_id
)); 