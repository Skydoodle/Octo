-- Octo Workspace Foundation V1

-- Automatically update updated_at columns.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Public user profiles linked to Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Company workspaces.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  base_currency text not null default 'TRY'
    check (base_currency in ('TRY', 'EUR', 'USD', 'GBP')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Users belonging to companies.
create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('owner', 'employee', 'accountant')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at triggers.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute procedure public.set_updated_at();

create trigger memberships_set_updated_at
  before update on public.company_memberships
  for each row execute procedure public.set_updated_at();

-- Helper: check whether the current user belongs to a company.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Helper: check whether the current user owns a company.
create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.is_company_owner(uuid) from public;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;

-- Enable Row-Level Security.
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;

-- Explicit API permissions.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert on public.company_memberships to authenticated;

-- Profile policies.
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() is not null
  and id = auth.uid()
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() is not null
  and id = auth.uid()
)
with check (
  auth.uid() is not null
  and id = auth.uid()
);

-- Company policies.
create policy "Members can view their companies"
on public.companies
for select
to authenticated
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.is_company_member(id)
  )
);

create policy "Users can create companies"
on public.companies
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
);

create policy "Owners can update companies"
on public.companies
for update
to authenticated
using (
  auth.uid() is not null
  and public.is_company_owner(id)
)
with check (
  auth.uid() is not null
  and public.is_company_owner(id)
);

create policy "Owners can delete companies"
on public.companies
for delete
to authenticated
using (
  auth.uid() is not null
  and public.is_company_owner(id)
);

-- Membership policies.
create policy "Members can view company memberships"
on public.company_memberships
for select
to authenticated
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.is_company_member(company_id)
  )
);

create policy "Company creator can create owner membership"
on public.company_memberships
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.companies
    where id = company_id
      and created_by = auth.uid()
  )
);
