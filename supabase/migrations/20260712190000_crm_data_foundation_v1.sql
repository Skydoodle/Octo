-- Octo CRM Data Foundation V1

create or replace function public.is_company_operator(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    where membership.company_id = target_company_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'employee')
      and membership.status = 'active'
  );
$$;

revoke all on function public.is_company_operator(uuid) from public;
grant execute on function public.is_company_operator(uuid) to authenticated;

create table public.business_parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  party_type text not null default 'organization'
    check (party_type in ('organization', 'individual')),
  display_name text not null
    check (char_length(btrim(display_name)) > 0),
  legal_name text,
  tax_id text,
  tax_office text,
  main_phone text,
  main_email text
    check (main_email is null or main_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  website text,
  sector text,
  city text,
  country_code text not null default 'TR'
    check (country_code ~ '^[A-Z]{2}$'),
  address text,
  relationship_status text not null default 'potential'
    check (relationship_status in ('potential', 'active', 'inactive', 'lost', 'other')),
  source text,
  notes text,
  normalized_name text not null,
  normalized_tax_id text,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);

create unique index business_parties_active_tax_id_unique
  on public.business_parties (company_id, normalized_tax_id)
  where relationship_status = 'active'
    and archived_at is null
    and normalized_tax_id is not null;

create index business_parties_company_id_idx on public.business_parties (company_id);
create index business_parties_normalized_name_idx on public.business_parties (company_id, normalized_name);
create index business_parties_archived_at_idx on public.business_parties (archived_at);

create table public.business_party_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null references public.business_parties(id) on delete cascade,
  role text not null
    check (role in ('prospect', 'customer', 'supplier', 'partner', 'other')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (party_id, role),
  constraint business_party_roles_party_company_fk
    foreign key (party_id, company_id)
    references public.business_parties(id, company_id)
    on delete cascade
);

create index business_party_roles_company_id_idx on public.business_party_roles (company_id);
create index business_party_roles_party_id_idx on public.business_party_roles (party_id);
create index business_party_roles_role_idx on public.business_party_roles (role);

create table public.business_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null references public.business_parties(id) on delete cascade,
  first_name text not null
    check (char_length(btrim(first_name)) > 0),
  last_name text,
  job_title text,
  department text,
  email text
    check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text,
  preferred_channel text
    check (preferred_channel is null or preferred_channel in ('email', 'phone', 'whatsapp', 'other')),
  decision_role text
    check (decision_role is null or decision_role in ('decision_maker', 'influencer', 'technical', 'user', 'procurement', 'finance', 'approver', 'other')),
  is_primary boolean not null default false,
  notes text,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_contacts_party_company_fk
    foreign key (party_id, company_id)
    references public.business_parties(id, company_id)
    on delete cascade
);

create unique index business_contacts_one_active_primary
  on public.business_contacts (party_id)
  where is_primary = true and archived_at is null;

create index business_contacts_company_id_idx on public.business_contacts (company_id);
create index business_contacts_party_id_idx on public.business_contacts (party_id);
create index business_contacts_email_lower_idx on public.business_contacts (lower(email));
create index business_contacts_archived_at_idx on public.business_contacts (archived_at);
create index business_contacts_is_primary_idx on public.business_contacts (is_primary);

create or replace function public.normalize_business_party()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  cleaned_tax_id text;
begin
  if actor_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'Company cannot be changed'
        using errcode = '22023';
    end if;
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := actor_user_id;
    new.created_at := now();
  end if;

  new.updated_by := actor_user_id;
  new.display_name := btrim(new.display_name);
  if new.display_name is null or new.display_name = '' then
    raise exception 'Display name cannot be blank'
      using errcode = '22023';
  end if;

  new.party_type := lower(btrim(new.party_type));
  new.relationship_status := lower(btrim(new.relationship_status));
  new.country_code := upper(btrim(new.country_code));
  new.normalized_name := lower(pg_catalog.regexp_replace(new.display_name, '[[:space:]]+', ' ', 'g'));

  new.legal_name := nullif(btrim(new.legal_name), '');
  new.tax_office := nullif(btrim(new.tax_office), '');
  new.main_phone := nullif(btrim(new.main_phone), '');
  new.main_email := nullif(lower(btrim(new.main_email)), '');
  new.website := nullif(btrim(new.website), '');
  new.sector := nullif(btrim(new.sector), '');
  new.city := nullif(btrim(new.city), '');
  new.address := nullif(btrim(new.address), '');
  new.source := nullif(btrim(new.source), '');
  new.notes := nullif(btrim(new.notes), '');

  cleaned_tax_id := nullif(upper(pg_catalog.regexp_replace(coalesce(new.tax_id, ''), '[^[:alnum:]]', '', 'g')), '');
  new.tax_id := cleaned_tax_id;
  new.normalized_tax_id := cleaned_tax_id;

  return new;
end;
$$;

create or replace function public.normalize_business_party_role()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
begin
  if actor_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;
  new.role := lower(btrim(new.role));
  new.created_by := actor_user_id;
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.normalize_business_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
begin
  if actor_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'Company cannot be changed'
        using errcode = '22023';
    end if;
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := actor_user_id;
    new.created_at := now();
  end if;

  new.updated_by := actor_user_id;
  new.first_name := btrim(new.first_name);
  if new.first_name is null or new.first_name = '' then
    raise exception 'First name cannot be blank'
      using errcode = '22023';
  end if;

  new.last_name := nullif(btrim(new.last_name), '');
  new.job_title := nullif(btrim(new.job_title), '');
  new.department := nullif(btrim(new.department), '');
  new.email := nullif(lower(btrim(new.email)), '');
  new.phone := nullif(btrim(new.phone), '');
  new.preferred_channel := nullif(lower(btrim(new.preferred_channel)), '');
  new.decision_role := nullif(lower(btrim(new.decision_role)), '');
  new.notes := nullif(btrim(new.notes), '');

  return new;
end;
$$;

revoke all on function public.normalize_business_party() from public, anon, authenticated;
revoke all on function public.normalize_business_party_role() from public, anon, authenticated;
revoke all on function public.normalize_business_contact() from public, anon, authenticated;

create trigger business_parties_normalize
  before insert or update on public.business_parties
  for each row execute procedure public.normalize_business_party();

create trigger business_parties_set_updated_at
  before update on public.business_parties
  for each row execute procedure public.set_updated_at();

create trigger business_party_roles_normalize
  before insert on public.business_party_roles
  for each row execute procedure public.normalize_business_party_role();

create trigger business_contacts_normalize
  before insert or update on public.business_contacts
  for each row execute procedure public.normalize_business_contact();

create trigger business_contacts_set_updated_at
  before update on public.business_contacts
  for each row execute procedure public.set_updated_at();

alter table public.business_parties enable row level security;
alter table public.business_party_roles enable row level security;
alter table public.business_contacts enable row level security;

revoke all on table public.business_parties from public, anon, authenticated;
revoke all on table public.business_party_roles from public, anon, authenticated;
revoke all on table public.business_contacts from public, anon, authenticated;

grant select, insert, update on table public.business_parties to authenticated;
grant select, insert on table public.business_party_roles to authenticated;
grant select, insert, update on table public.business_contacts to authenticated;

create policy "Members can read business parties"
on public.business_parties
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Operators can create business parties"
on public.business_parties
for insert
to authenticated
with check (
  public.is_company_operator(company_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy "Operators can update business parties"
on public.business_parties
for update
to authenticated
using (public.is_company_operator(company_id))
with check (
  public.is_company_operator(company_id)
  and updated_by = auth.uid()
);

create policy "Members can read business party roles"
on public.business_party_roles
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Operators can create business party roles"
on public.business_party_roles
for insert
to authenticated
with check (
  public.is_company_operator(company_id)
  and created_by = auth.uid()
);

create policy "Members can read business contacts"
on public.business_contacts
for select
to authenticated
using (public.is_company_member(company_id));

create policy "Operators can create business contacts"
on public.business_contacts
for insert
to authenticated
with check (
  public.is_company_operator(company_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy "Operators can update business contacts"
on public.business_contacts
for update
to authenticated
using (public.is_company_operator(company_id))
with check (
  public.is_company_operator(company_id)
  and updated_by = auth.uid()
);

create or replace function public.create_business_party(
  target_company_id uuid,
  party_display_name text,
  initial_roles text[],
  party_type_value text,
  party_legal_name text,
  party_tax_id text,
  party_tax_office text,
  party_main_phone text,
  party_main_email text,
  party_website text,
  party_sector text,
  party_city text,
  party_country_code text,
  party_address text,
  party_relationship_status text,
  party_source text,
  party_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  created_party_id uuid;
  violated_constraint_name text;
begin
  if actor_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if not public.is_company_operator(target_company_id) then
    raise exception 'Company operator access is required'
      using errcode = '42501';
  end if;

  if initial_roles is null or cardinality(initial_roles) = 0 then
    raise exception 'At least one business party role is required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(initial_roles) as supplied_role(role_value)
    where supplied_role.role_value is null
      or lower(btrim(supplied_role.role_value)) not in ('prospect', 'customer', 'supplier', 'partner', 'other')
  ) then
    raise exception 'Invalid business party role'
      using errcode = '22023';
  end if;

  insert into public.business_parties (
    company_id,
    party_type,
    display_name,
    legal_name,
    tax_id,
    tax_office,
    main_phone,
    main_email,
    website,
    sector,
    city,
    country_code,
    address,
    relationship_status,
    source,
    notes,
    normalized_name,
    created_by,
    updated_by
  ) values (
    target_company_id,
    party_type_value,
    party_display_name,
    party_legal_name,
    party_tax_id,
    party_tax_office,
    party_main_phone,
    party_main_email,
    party_website,
    party_sector,
    party_city,
    party_country_code,
    party_address,
    party_relationship_status,
    party_source,
    party_notes,
    party_display_name,
    actor_user_id,
    actor_user_id
  ) returning id into created_party_id;

  insert into public.business_party_roles (company_id, party_id, role, created_by)
  select
    target_company_id,
    created_party_id,
    normalized_role.role_value,
    actor_user_id
  from (
    select distinct lower(btrim(supplied_role.role_value)) as role_value
    from unnest(initial_roles) as supplied_role(role_value)
  ) as normalized_role;

  return created_party_id;
exception
  when unique_violation then
    get stacked diagnostics violated_constraint_name = constraint_name;
    if violated_constraint_name = 'business_parties_active_tax_id_unique' then
      raise exception 'An active business party with this tax ID already exists'
        using errcode = '23505',
              constraint = 'business_parties_active_tax_id_unique';
    end if;
    raise;
end;
$$;

create or replace function public.set_business_party_roles(
  target_company_id uuid,
  target_party_id uuid,
  intended_roles text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
begin
  if actor_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if not public.is_company_operator(target_company_id) then
    raise exception 'Company operator access is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_parties as party
    where party.id = target_party_id
      and party.company_id = target_company_id
  ) then
    raise exception 'Business party was not found in this company'
      using errcode = '22023';
  end if;

  if intended_roles is null or cardinality(intended_roles) = 0 then
    raise exception 'At least one business party role is required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(intended_roles) as supplied_role(role_value)
    where supplied_role.role_value is null
      or lower(btrim(supplied_role.role_value)) not in ('prospect', 'customer', 'supplier', 'partner', 'other')
  ) then
    raise exception 'Invalid business party role'
      using errcode = '22023';
  end if;

  perform 1
  from public.business_parties as party
  where party.id = target_party_id
    and party.company_id = target_company_id
  for update;

  delete from public.business_party_roles as existing_role
  where existing_role.party_id = target_party_id
    and existing_role.company_id = target_company_id;

  insert into public.business_party_roles (company_id, party_id, role, created_by)
  select
    target_company_id,
    target_party_id,
    normalized_role.role_value,
    actor_user_id
  from (
    select distinct lower(btrim(supplied_role.role_value)) as role_value
    from unnest(intended_roles) as supplied_role(role_value)
  ) as normalized_role;
end;
$$;

revoke all on function public.create_business_party(uuid, text, text[], text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.set_business_party_roles(uuid, uuid, text[]) from public, anon;

grant execute on function public.create_business_party(uuid, text, text[], text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_business_party_roles(uuid, uuid, text[]) to authenticated;
