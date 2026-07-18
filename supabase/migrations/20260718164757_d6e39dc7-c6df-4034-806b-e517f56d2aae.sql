create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  key text not null,
  value jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (owner_id, category, key)
);

grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

alter table public.user_settings enable row level security;

create policy "Users can manage own settings"
  on public.user_settings
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());


create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  status text not null default 'disconnected',
  configuration jsonb default '{}'::jsonb not null,
  last_sync timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (owner_id, provider)
);

grant select, insert, update, delete on public.integrations to authenticated;
grant all on public.integrations to service_role;

alter table public.integrations enable row level security;

create policy "Users can manage own integrations"
  on public.integrations
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());


create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.handle_updated_at();
