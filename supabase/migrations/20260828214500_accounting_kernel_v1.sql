-- Octo Accounting Kernel V1
-- Authoritative double-entry accounting foundation.
-- Operational/commercial records remain authoritative in their own domains; this layer owns accounting truth.

create table public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null check (char_length(btrim(code)) > 0),
  name text not null check (char_length(btrim(name)) > 0),
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  normal_balance text not null check (normal_balance in ('debit','credit')),
  parent_account_id uuid,
  system_key text,
  allow_posting boolean not null default true,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  unique(company_id, code),
  constraint accounting_accounts_parent_company_fk
    foreign key(parent_account_id, company_id)
    references public.accounting_accounts(id, company_id)
);

create unique index accounting_accounts_system_key_unique
  on public.accounting_accounts(company_id, system_key)
  where system_key is not null;
create index accounting_accounts_company_idx on public.accounting_accounts(company_id);
create index accounting_accounts_parent_idx on public.accounting_accounts(parent_account_id);

create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 2000 and 9999),
  period_number integer not null check (period_number between 1 and 13),
  name text not null check (char_length(btrim(name)) > 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed','locked')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  unique(company_id, fiscal_year, period_number),
  check (end_date >= start_date),
  check ((status = 'open' and closed_at is null and closed_by is null) or status <> 'open')
);
create index accounting_periods_company_dates_idx
  on public.accounting_periods(company_id, start_date, end_date);

create table public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_number text,
  entry_date date not null,
  period_id uuid not null,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  description text not null check (char_length(btrim(description)) > 0),
  currency text not null check (currency in ('TRY','EUR','USD','GBP')),
  source_domain text not null check (char_length(btrim(source_domain)) > 0),
  source_type text not null check (char_length(btrim(source_type)) > 0),
  source_id uuid,
  source_ref text,
  source_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot) = 'object'),
  reversal_of_entry_id uuid,
  posted_at timestamptz,
  posted_by uuid references auth.users(id),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  unique(company_id, entry_number),
  constraint accounting_journal_entries_period_company_fk
    foreign key(period_id, company_id)
    references public.accounting_periods(id, company_id),
  constraint accounting_journal_entries_reversal_company_fk
    foreign key(reversal_of_entry_id, company_id)
    references public.accounting_journal_entries(id, company_id),
  check ((status = 'draft') = (posted_at is null and posted_by is null)),
  check ((status <> 'draft') = (posted_at is not null and posted_by is not null)),
  check ((status = 'reversed') = (reversed_at is not null and reversed_by is not null))
);

create unique index accounting_journal_entries_source_unique
  on public.accounting_journal_entries(company_id, source_domain, source_type, source_id)
  where source_id is not null and reversal_of_entry_id is null;
create unique index accounting_journal_entries_single_reversal
  on public.accounting_journal_entries(reversal_of_entry_id)
  where reversal_of_entry_id is not null;
create index accounting_journal_entries_company_date_idx
  on public.accounting_journal_entries(company_id, entry_date desc);
create index accounting_journal_entries_period_idx
  on public.accounting_journal_entries(period_id);
create index accounting_journal_entries_status_idx
  on public.accounting_journal_entries(company_id, status);

create table public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  journal_entry_id uuid not null,
  line_number integer not null check (line_number > 0),
  account_id uuid not null,
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  party_id uuid,
  source_line_ref text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(journal_entry_id, line_number),
  constraint accounting_journal_lines_entry_company_fk
    foreign key(journal_entry_id, company_id)
    references public.accounting_journal_entries(id, company_id) on delete cascade,
  constraint accounting_journal_lines_account_company_fk
    foreign key(account_id, company_id)
    references public.accounting_accounts(id, company_id),
  constraint accounting_journal_lines_party_company_fk
    foreign key(party_id, company_id)
    references public.business_parties(id, company_id),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index accounting_journal_lines_company_idx on public.accounting_journal_lines(company_id);
create index accounting_journal_lines_entry_idx on public.accounting_journal_lines(journal_entry_id, line_number);
create index accounting_journal_lines_account_idx on public.accounting_journal_lines(company_id, account_id);
create index accounting_journal_lines_party_idx on public.accounting_journal_lines(company_id, party_id) where party_id is not null;

create table public.accounting_document_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 2000 and 9999),
  next_number bigint not null default 1 check (next_number > 0),
  primary key(company_id, fiscal_year)
);

create or replace function public.protect_accounting_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authenticated user is required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor_id;
    new.updated_by := actor_id;
    new.code := btrim(new.code);
    new.name := btrim(new.name);
    new.system_key := nullif(lower(btrim(new.system_key)), '');
    return new;
  end if;

  if new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Accounting account identity is immutable' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.accounting_journal_lines l
    join public.accounting_journal_entries e on e.id = l.journal_entry_id
    where l.account_id = old.id and e.status <> 'draft'
  ) and row(new.code, new.account_type, new.normal_balance, new.parent_account_id)
      is distinct from row(old.code, old.account_type, old.normal_balance, old.parent_account_id) then
    raise exception 'Posted accounting account structure is immutable' using errcode = '42501';
  end if;

  new.code := btrim(new.code);
  new.name := btrim(new.name);
  new.system_key := nullif(lower(btrim(new.system_key)), '');
  new.updated_by := actor_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger accounting_accounts_protect
before insert or update on public.accounting_accounts
for each row execute function public.protect_accounting_account();

create or replace function public.protect_accounting_journal_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Posted journal entries cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status <> 'draft' and current_setting('octo.accounting_controlled_update', true) <> 'on' then
    raise exception 'Posted journal entries require a controlled accounting operation' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'Journal entry company cannot change' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger accounting_journal_entries_protect
before update or delete on public.accounting_journal_entries
for each row execute function public.protect_accounting_journal_entry();

create or replace function public.protect_accounting_journal_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare target_entry uuid; target_status text;
begin
  target_entry := case when tg_op = 'DELETE' then old.journal_entry_id else new.journal_entry_id end;
  select status into target_status from public.accounting_journal_entries where id = target_entry;
  if target_status is null then
    raise exception 'Journal entry was not found' using errcode = 'P0002';
  end if;
  if target_status <> 'draft' and current_setting('octo.accounting_controlled_update', true) <> 'on' then
    raise exception 'Posted journal lines are immutable' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger accounting_journal_lines_protect
before insert or update or delete on public.accounting_journal_lines
for each row execute function public.protect_accounting_journal_line();

create or replace function public.next_accounting_entry_number(target_company_id uuid, target_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare target_year integer := extract(year from target_date)::integer; allocated bigint;
begin
  insert into public.accounting_document_number_counters(company_id, fiscal_year, next_number)
  values(target_company_id, target_year, 2)
  on conflict(company_id, fiscal_year)
  do update set next_number = public.accounting_document_number_counters.next_number + 1
  returning next_number - 1 into allocated;
  return 'YE-' || target_year::text || '-' || lpad(allocated::text, 6, '0');
end;
$$;

create or replace function public.create_accounting_account(
  target_company_id uuid,
  account_code text,
  account_name text,
  account_type_value text,
  normal_balance_value text,
  parent_id uuid default null,
  account_system_key text default null,
  posting_allowed boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); created_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if nullif(btrim(account_code), '') is null or nullif(btrim(account_name), '') is null then
    raise exception 'Account code and name are required' using errcode = '22023';
  end if;
  if account_type_value not in ('asset','liability','equity','revenue','expense') or normal_balance_value not in ('debit','credit') then
    raise exception 'Accounting account classification is invalid' using errcode = '22023';
  end if;
  if parent_id is not null and not exists (
    select 1 from public.accounting_accounts where id = parent_id and company_id = target_company_id
  ) then
    raise exception 'Parent accounting account was not found' using errcode = 'P0002';
  end if;

  insert into public.accounting_accounts(
    company_id, code, name, account_type, normal_balance, parent_account_id, system_key, allow_posting, created_by, updated_by
  ) values (
    target_company_id, account_code, account_name, account_type_value, normal_balance_value, parent_id, account_system_key, coalesce(posting_allowed, true), actor_id, actor_id
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.create_accounting_period(
  target_company_id uuid,
  target_fiscal_year integer,
  target_period_number integer,
  period_name text,
  period_start date,
  period_end date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); created_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if target_period_number not between 1 and 13 or period_start is null or period_end is null or period_end < period_start or nullif(btrim(period_name), '') is null then
    raise exception 'Accounting period fields are invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.accounting_periods p
    where p.company_id = target_company_id
      and daterange(p.start_date, p.end_date, '[]') && daterange(period_start, period_end, '[]')
  ) then
    raise exception 'Accounting periods cannot overlap' using errcode = '23514';
  end if;
  insert into public.accounting_periods(company_id, fiscal_year, period_number, name, start_date, end_date, created_by)
  values(target_company_id, target_fiscal_year, target_period_number, period_name, period_start, period_end, actor_id)
  returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.create_accounting_journal_entry(
  target_company_id uuid,
  requested_entry_date date,
  requested_description text,
  requested_source_domain text,
  requested_source_type text,
  requested_source_id uuid default null,
  requested_source_ref text default null,
  requested_source_snapshot jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); selected_period uuid; company_currency text; created_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if requested_entry_date is null or nullif(btrim(requested_description), '') is null or nullif(btrim(requested_source_domain), '') is null or nullif(btrim(requested_source_type), '') is null then
    raise exception 'Journal entry fields are invalid' using errcode = '22023';
  end if;
  if requested_source_snapshot is null or jsonb_typeof(requested_source_snapshot) <> 'object' then
    raise exception 'Source snapshot must be a JSON object' using errcode = '22023';
  end if;

  select p.id into selected_period
  from public.accounting_periods p
  where p.company_id = target_company_id
    and p.status = 'open'
    and requested_entry_date between p.start_date and p.end_date
  order by p.start_date desc
  limit 1;
  if selected_period is null then
    raise exception 'No open accounting period covers the entry date' using errcode = '23514';
  end if;

  select c.base_currency into company_currency from public.companies c where c.id = target_company_id;

  insert into public.accounting_journal_entries(
    company_id, entry_date, period_id, description, currency, source_domain, source_type, source_id, source_ref, source_snapshot, created_by
  ) values (
    target_company_id, requested_entry_date, selected_period, requested_description, company_currency,
    lower(btrim(requested_source_domain)), lower(btrim(requested_source_type)), requested_source_id,
    nullif(btrim(requested_source_ref), ''), requested_source_snapshot, actor_id
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.replace_accounting_journal_lines(
  target_company_id uuid,
  target_entry_id uuid,
  lines jsonb
)
returns public.accounting_journal_entries
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); entry_row public.accounting_journal_entries%rowtype; line jsonb; idx integer := 0; account_row public.accounting_accounts%rowtype; party_value uuid; debit_value numeric(18,2); credit_value numeric(18,2); updated_row public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if lines is null or jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 2 then
    raise exception 'At least two journal lines are required' using errcode = '22023';
  end if;

  select * into entry_row
  from public.accounting_journal_entries e
  where e.id = target_entry_id and e.company_id = target_company_id
  for update;
  if not found then raise exception 'Journal entry was not found' using errcode = 'P0002'; end if;
  if entry_row.status <> 'draft' then raise exception 'Only draft journal entries can be edited' using errcode = '23514'; end if;

  delete from public.accounting_journal_lines where journal_entry_id = target_entry_id and company_id = target_company_id;

  for line in select value from jsonb_array_elements(lines) loop
    idx := idx + 1;
    select * into account_row
    from public.accounting_accounts a
    where a.id = (line->>'account_id')::uuid and a.company_id = target_company_id;
    if not found or not account_row.is_active or not account_row.allow_posting then
      raise exception 'Journal line account is missing, inactive, or non-posting' using errcode = '23514';
    end if;

    debit_value := coalesce((line->>'debit')::numeric, 0);
    credit_value := coalesce((line->>'credit')::numeric, 0);
    if debit_value < 0 or credit_value < 0 or not ((debit_value > 0 and credit_value = 0) or (credit_value > 0 and debit_value = 0)) then
      raise exception 'Each journal line must contain exactly one positive debit or credit amount' using errcode = '22023';
    end if;

    party_value := null;
    if nullif(line->>'party_id', '') is not null then
      party_value := (line->>'party_id')::uuid;
      if not exists(select 1 from public.business_parties p where p.id = party_value and p.company_id = target_company_id) then
        raise exception 'Journal line party was not found' using errcode = 'P0002';
      end if;
    end if;

    insert into public.accounting_journal_lines(
      company_id, journal_entry_id, line_number, account_id, description, debit, credit, party_id, source_line_ref, metadata
    ) values (
      target_company_id, target_entry_id, idx, account_row.id, nullif(btrim(line->>'description'), ''), debit_value, credit_value,
      party_value, nullif(btrim(line->>'source_line_ref'), ''), coalesce(line->'metadata', '{}'::jsonb)
    );
  end loop;

  update public.accounting_journal_entries set updated_at = now() where id = target_entry_id returning * into updated_row;
  return updated_row;
end;
$$;

create or replace function public.post_accounting_journal_entry(target_company_id uuid, target_entry_id uuid)
returns public.accounting_journal_entries
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); entry_row public.accounting_journal_entries%rowtype; debit_total numeric(18,2); credit_total numeric(18,2); line_count integer; generated_number text; updated_row public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  select * into entry_row
  from public.accounting_journal_entries e
  where e.id = target_entry_id and e.company_id = target_company_id
  for update;
  if not found then raise exception 'Journal entry was not found' using errcode = 'P0002'; end if;
  if entry_row.status <> 'draft' then raise exception 'Only draft journal entries can be posted' using errcode = '23514'; end if;
  if not exists(select 1 from public.accounting_periods p where p.id = entry_row.period_id and p.company_id = target_company_id and p.status = 'open' and entry_row.entry_date between p.start_date and p.end_date) then
    raise exception 'Journal entry period is not open' using errcode = '23514';
  end if;

  select count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
    into line_count, debit_total, credit_total
  from public.accounting_journal_lines
  where journal_entry_id = target_entry_id and company_id = target_company_id;

  if line_count < 2 or debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Journal entry must contain at least two balanced lines' using errcode = '23514';
  end if;

  generated_number := public.next_accounting_entry_number(target_company_id, entry_row.entry_date);
  perform set_config('octo.accounting_controlled_update', 'on', true);
  update public.accounting_journal_entries
  set entry_number = generated_number, status = 'posted', posted_at = now(), posted_by = actor_id, updated_at = now()
  where id = target_entry_id and company_id = target_company_id
  returning * into updated_row;
  perform set_config('octo.accounting_controlled_update', '', true);
  return updated_row;
end;
$$;

create or replace function public.reverse_accounting_journal_entry(
  target_company_id uuid,
  target_entry_id uuid,
  requested_reversal_date date,
  reversal_reason text
)
returns public.accounting_journal_entries
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); original public.accounting_journal_entries%rowtype; selected_period uuid; reversal_id uuid; reversal_number text; reversal_row public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if requested_reversal_date is null or nullif(btrim(reversal_reason), '') is null then
    raise exception 'Reversal date and reason are required' using errcode = '22023';
  end if;

  select * into original
  from public.accounting_journal_entries e
  where e.id = target_entry_id and e.company_id = target_company_id
  for update;
  if not found then raise exception 'Journal entry was not found' using errcode = 'P0002'; end if;
  if original.status <> 'posted' then raise exception 'Only posted journal entries can be reversed' using errcode = '23514'; end if;
  if exists(select 1 from public.accounting_journal_entries where reversal_of_entry_id = original.id) then
    raise exception 'Journal entry is already reversed' using errcode = '23505';
  end if;

  select p.id into selected_period
  from public.accounting_periods p
  where p.company_id = target_company_id and p.status = 'open' and requested_reversal_date between p.start_date and p.end_date
  order by p.start_date desc limit 1;
  if selected_period is null then raise exception 'No open accounting period covers the reversal date' using errcode = '23514'; end if;

  reversal_number := public.next_accounting_entry_number(target_company_id, requested_reversal_date);
  insert into public.accounting_journal_entries(
    company_id, entry_number, entry_date, period_id, status, description, currency,
    source_domain, source_type, source_id, source_ref, source_snapshot, reversal_of_entry_id,
    posted_at, posted_by, created_by
  ) values (
    target_company_id, reversal_number, requested_reversal_date, selected_period, 'posted',
    'Ters kayıt: ' || reversal_reason, original.currency,
    'accounting', 'journal_reversal', original.id, original.entry_number,
    jsonb_build_object('original_entry_id', original.id, 'original_entry_number', original.entry_number, 'reason', reversal_reason),
    original.id, now(), actor_id, actor_id
  ) returning id into reversal_id;

  perform set_config('octo.accounting_controlled_update', 'on', true);
  insert into public.accounting_journal_lines(
    company_id, journal_entry_id, line_number, account_id, description, debit, credit, party_id, source_line_ref, metadata
  )
  select company_id, reversal_id, line_number, account_id, description, credit, debit, party_id, source_line_ref,
         metadata || jsonb_build_object('reversal_of_line_id', id)
  from public.accounting_journal_lines
  where journal_entry_id = original.id and company_id = target_company_id
  order by line_number;

  update public.accounting_journal_entries
  set status = 'reversed', reversed_at = now(), reversed_by = actor_id, updated_at = now()
  where id = original.id;
  perform set_config('octo.accounting_controlled_update', '', true);

  select * into reversal_row from public.accounting_journal_entries where id = reversal_id;
  return reversal_row;
end;
$$;

revoke all on function public.protect_accounting_account(), public.protect_accounting_journal_entry(), public.protect_accounting_journal_line() from public, anon, authenticated;
revoke all on function public.next_accounting_entry_number(uuid,date) from public, anon, authenticated;
revoke all on function public.create_accounting_account(uuid,text,text,text,text,uuid,text,boolean), public.create_accounting_period(uuid,integer,integer,text,date,date), public.create_accounting_journal_entry(uuid,date,text,text,text,uuid,text,jsonb), public.replace_accounting_journal_lines(uuid,uuid,jsonb), public.post_accounting_journal_entry(uuid,uuid), public.reverse_accounting_journal_entry(uuid,uuid,date,text) from public, anon;
grant execute on function public.create_accounting_account(uuid,text,text,text,text,uuid,text,boolean), public.create_accounting_period(uuid,integer,integer,text,date,date), public.create_accounting_journal_entry(uuid,date,text,text,text,uuid,text,jsonb), public.replace_accounting_journal_lines(uuid,uuid,jsonb), public.post_accounting_journal_entry(uuid,uuid), public.reverse_accounting_journal_entry(uuid,uuid,date,text) to authenticated;

alter table public.accounting_accounts enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;
alter table public.accounting_document_number_counters enable row level security;

revoke all on table public.accounting_accounts, public.accounting_periods, public.accounting_journal_entries, public.accounting_journal_lines, public.accounting_document_number_counters from public, anon, authenticated;
grant select on table public.accounting_accounts, public.accounting_periods, public.accounting_journal_entries, public.accounting_journal_lines to authenticated;

create policy accounting_accounts_read on public.accounting_accounts
for select to authenticated using (public.is_company_member(company_id));
create policy accounting_periods_read on public.accounting_periods
for select to authenticated using (public.is_company_member(company_id));
create policy accounting_journal_entries_read on public.accounting_journal_entries
for select to authenticated using (public.is_company_member(company_id));
create policy accounting_journal_lines_read on public.accounting_journal_lines
for select to authenticated using (public.is_company_member(company_id));

comment on table public.accounting_accounts is 'Company-scoped chart of accounts for Octo accounting truth. system_key is a stable semantic mapping hook, not a legal account code.';
comment on table public.accounting_journal_entries is 'Double-entry accounting header with source lineage. Posted entries are immutable and corrected by reversal.';
comment on table public.accounting_journal_lines is 'Balanced debit/credit journal lines linked to canonical accounts and optional business parties.';
