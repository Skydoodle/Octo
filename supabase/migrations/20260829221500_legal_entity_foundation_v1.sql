-- Octo Legal Entity Foundation V1
-- Separates tenant/workspace identity (companies) from statutory/legal entity identity.
-- Turkey remains the initial jurisdiction; the schema is intentionally jurisdiction-neutral.

create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null check (char_length(btrim(code)) > 0),
  display_name text not null check (char_length(btrim(display_name)) > 0),
  legal_name text,
  country_code text not null default 'TR' check (country_code ~ '^[A-Z]{2}$'),
  registration_number text,
  tax_id text,
  tax_office text,
  functional_currency text not null default 'TRY' check (functional_currency in ('TRY','EUR','USD','GBP')),
  fiscal_year_start_month integer not null default 1 check (fiscal_year_start_month between 1 and 12),
  timezone text not null default 'Europe/Istanbul' check (char_length(btrim(timezone)) > 0),
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  unique(company_id, code)
);

create unique index legal_entities_one_default_per_company
  on public.legal_entities(company_id)
  where is_default and status = 'active';
create unique index legal_entities_tax_identity_unique
  on public.legal_entities(company_id, country_code, tax_id)
  where tax_id is not null;
create index legal_entities_company_idx on public.legal_entities(company_id);
create index legal_entities_status_idx on public.legal_entities(company_id, status);

-- Existing Octo workspaces currently operate as one statutory entity.
insert into public.legal_entities(
  company_id, code, display_name, legal_name, country_code, functional_currency,
  fiscal_year_start_month, timezone, is_default, status, created_by, updated_by
)
select
  c.id, 'MAIN', c.name, c.name, 'TR', c.base_currency,
  1, 'Europe/Istanbul', true, 'active', c.created_by, c.created_by
from public.companies c
where not exists (select 1 from public.legal_entities e where e.company_id = c.id);

create or replace function public.normalize_legal_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode = '42501'; end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'Legal entity company cannot change' using errcode = '23514';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := actor_id;
    new.created_at := now();
  end if;

  new.code := upper(btrim(new.code));
  new.display_name := btrim(new.display_name);
  new.legal_name := nullif(btrim(new.legal_name), '');
  new.country_code := upper(btrim(new.country_code));
  new.registration_number := nullif(upper(btrim(new.registration_number)), '');
  new.tax_id := nullif(upper(pg_catalog.regexp_replace(coalesce(new.tax_id, ''), '[^[:alnum:]]', '', 'g')), '');
  new.tax_office := nullif(btrim(new.tax_office), '');
  new.functional_currency := upper(btrim(new.functional_currency));
  new.timezone := btrim(new.timezone);
  new.updated_by := actor_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger legal_entities_normalize
before insert or update on public.legal_entities
for each row execute function public.normalize_legal_entity();

create or replace function public.default_legal_entity_id(target_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.legal_entities e
  where e.company_id = target_company_id and e.is_default and e.status = 'active'
  limit 1;
$$;

create or replace function public.create_legal_entity(
  target_company_id uuid,
  entity_code text,
  entity_display_name text,
  entity_legal_name text default null,
  entity_country_code text default 'TR',
  entity_registration_number text default null,
  entity_tax_id text default null,
  entity_tax_office text default null,
  entity_functional_currency text default 'TRY',
  entity_fiscal_year_start_month integer default 1,
  entity_timezone text default 'Europe/Istanbul',
  make_default boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); created_id uuid;
begin
  if actor_id is null or not public.is_company_owner(target_company_id) then
    raise exception 'Company owner access is required' using errcode = '42501';
  end if;

  if make_default then
    update public.legal_entities
    set is_default = false, updated_by = actor_id, updated_at = now()
    where company_id = target_company_id and is_default;
  end if;

  insert into public.legal_entities(
    company_id, code, display_name, legal_name, country_code, registration_number,
    tax_id, tax_office, functional_currency, fiscal_year_start_month, timezone,
    is_default, created_by, updated_by
  ) values (
    target_company_id, entity_code, entity_display_name, entity_legal_name,
    entity_country_code, entity_registration_number, entity_tax_id, entity_tax_office,
    entity_functional_currency, entity_fiscal_year_start_month, entity_timezone,
    make_default, actor_id, actor_id
  ) returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.set_default_legal_entity(target_company_id uuid, target_legal_entity_id uuid)
returns public.legal_entities
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); selected public.legal_entities%rowtype;
begin
  if actor_id is null or not public.is_company_owner(target_company_id) then
    raise exception 'Company owner access is required' using errcode = '42501';
  end if;

  select * into selected
  from public.legal_entities
  where id = target_legal_entity_id and company_id = target_company_id and status = 'active'
  for update;
  if not found then raise exception 'Active legal entity was not found' using errcode = 'P0002'; end if;

  update public.legal_entities
  set is_default = false, updated_by = actor_id, updated_at = now()
  where company_id = target_company_id and is_default and id <> target_legal_entity_id;

  update public.legal_entities
  set is_default = true, updated_by = actor_id, updated_at = now()
  where id = target_legal_entity_id
  returning * into selected;

  return selected;
end;
$$;

-- Statutory ownership is explicit on economic/accounting headers.
alter table public.sales_quotes add column legal_entity_id uuid;
alter table public.sales_orders add column legal_entity_id uuid;
alter table public.finance_accounts add column legal_entity_id uuid;
alter table public.finance_invoices add column legal_entity_id uuid;
alter table public.finance_payments add column legal_entity_id uuid;
alter table public.accounting_accounts add column legal_entity_id uuid;
alter table public.accounting_periods add column legal_entity_id uuid;
alter table public.accounting_journal_entries add column legal_entity_id uuid;

-- Existing records: preserve the current one-company/one-entity semantics.
update public.sales_quotes q
set legal_entity_id = public.default_legal_entity_id(q.company_id)
where q.legal_entity_id is null;

update public.sales_orders o
set legal_entity_id = q.legal_entity_id
from public.sales_quotes q
where q.id = o.source_quote_id and q.company_id = o.company_id and o.legal_entity_id is null;

update public.finance_accounts a
set legal_entity_id = public.default_legal_entity_id(a.company_id)
where a.legal_entity_id is null;

update public.finance_invoices i
set legal_entity_id = o.legal_entity_id
from public.sales_orders o
where i.source_sales_order_id = o.id and i.company_id = o.company_id and i.legal_entity_id is null;

update public.finance_invoices i
set legal_entity_id = public.default_legal_entity_id(i.company_id)
where i.legal_entity_id is null;

update public.finance_payments p
set legal_entity_id = a.legal_entity_id
from public.finance_accounts a
where a.id = p.account_id and a.company_id = p.company_id and p.legal_entity_id is null;

update public.accounting_accounts a
set legal_entity_id = public.default_legal_entity_id(a.company_id)
where a.legal_entity_id is null;

update public.accounting_periods p
set legal_entity_id = public.default_legal_entity_id(p.company_id)
where p.legal_entity_id is null;

update public.accounting_journal_entries j
set legal_entity_id = p.legal_entity_id
from public.accounting_periods p
where p.id = j.period_id and p.company_id = j.company_id and j.legal_entity_id is null;

-- Compatibility bridge: existing RPC signatures keep working while entity-aware RPCs are added later.
create or replace function public.assign_sales_quote_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then new.legal_entity_id := public.default_legal_entity_id(new.company_id); end if;
  if new.legal_entity_id is null then raise exception 'Default legal entity is not configured' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_sales_order_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then
    select q.legal_entity_id into new.legal_entity_id
    from public.sales_quotes q
    where q.id = new.source_quote_id and q.company_id = new.company_id;
  end if;
  if new.legal_entity_id is null then raise exception 'Sales order legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_finance_account_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then new.legal_entity_id := public.default_legal_entity_id(new.company_id); end if;
  if new.legal_entity_id is null then raise exception 'Finance account legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_finance_invoice_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null and new.source_sales_order_id is not null then
    select o.legal_entity_id into new.legal_entity_id
    from public.sales_orders o
    where o.id = new.source_sales_order_id and o.company_id = new.company_id;
  end if;
  if new.legal_entity_id is null then new.legal_entity_id := public.default_legal_entity_id(new.company_id); end if;
  if new.legal_entity_id is null then raise exception 'Finance invoice legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_finance_payment_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then
    select a.legal_entity_id into new.legal_entity_id
    from public.finance_accounts a
    where a.id = new.account_id and a.company_id = new.company_id;
  end if;
  if new.legal_entity_id is null then raise exception 'Finance payment legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_accounting_account_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then new.legal_entity_id := public.default_legal_entity_id(new.company_id); end if;
  if new.legal_entity_id is null then raise exception 'Accounting account legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_accounting_period_legal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then new.legal_entity_id := public.default_legal_entity_id(new.company_id); end if;
  if new.legal_entity_id is null then raise exception 'Accounting period legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.assign_accounting_journal_entity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is null then
    select p.legal_entity_id into new.legal_entity_id
    from public.accounting_periods p
    where p.id = new.period_id and p.company_id = new.company_id;
  end if;
  if new.legal_entity_id is null then raise exception 'Journal entry legal entity cannot be resolved' using errcode='23514'; end if;
  return new;
end $$;

create trigger aaa_sales_quotes_assign_entity before insert on public.sales_quotes
for each row execute function public.assign_sales_quote_legal_entity();
create trigger aaa_sales_orders_assign_entity before insert on public.sales_orders
for each row execute function public.assign_sales_order_legal_entity();
create trigger aaa_finance_accounts_assign_entity before insert on public.finance_accounts
for each row execute function public.assign_finance_account_legal_entity();
create trigger aaa_finance_invoices_assign_entity before insert on public.finance_invoices
for each row execute function public.assign_finance_invoice_legal_entity();
create trigger aaa_finance_payments_assign_entity before insert on public.finance_payments
for each row execute function public.assign_finance_payment_legal_entity();
create trigger aaa_accounting_accounts_assign_entity before insert on public.accounting_accounts
for each row execute function public.assign_accounting_account_legal_entity();
create trigger aaa_accounting_periods_assign_entity before insert on public.accounting_periods
for each row execute function public.assign_accounting_period_legal_entity();
create trigger aaa_accounting_journals_assign_entity before insert on public.accounting_journal_entries
for each row execute function public.assign_accounting_journal_entity();

create or replace function public.protect_legal_entity_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.legal_entity_id is distinct from old.legal_entity_id then
    raise exception 'Legal entity assignment is immutable after creation' using errcode='42501';
  end if;
  return new;
end $$;

create trigger sales_quotes_entity_immutable before update on public.sales_quotes
for each row execute function public.protect_legal_entity_assignment();
create trigger sales_orders_entity_immutable before update on public.sales_orders
for each row execute function public.protect_legal_entity_assignment();
create trigger finance_accounts_entity_immutable before update on public.finance_accounts
for each row execute function public.protect_legal_entity_assignment();
create trigger finance_invoices_entity_immutable before update on public.finance_invoices
for each row execute function public.protect_legal_entity_assignment();
create trigger finance_payments_entity_immutable before update on public.finance_payments
for each row execute function public.protect_legal_entity_assignment();
create trigger accounting_accounts_entity_immutable before update on public.accounting_accounts
for each row execute function public.protect_legal_entity_assignment();
create trigger accounting_periods_entity_immutable before update on public.accounting_periods
for each row execute function public.protect_legal_entity_assignment();
create trigger accounting_journals_entity_immutable before update on public.accounting_journal_entries
for each row execute function public.protect_legal_entity_assignment();

alter table public.sales_quotes alter column legal_entity_id set not null;
alter table public.sales_orders alter column legal_entity_id set not null;
alter table public.finance_accounts alter column legal_entity_id set not null;
alter table public.finance_invoices alter column legal_entity_id set not null;
alter table public.finance_payments alter column legal_entity_id set not null;
alter table public.accounting_accounts alter column legal_entity_id set not null;
alter table public.accounting_periods alter column legal_entity_id set not null;
alter table public.accounting_journal_entries alter column legal_entity_id set not null;

alter table public.sales_quotes
  add constraint sales_quotes_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.sales_orders
  add constraint sales_orders_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.finance_accounts
  add constraint finance_accounts_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.finance_invoices
  add constraint finance_invoices_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.finance_payments
  add constraint finance_payments_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.accounting_accounts
  add constraint accounting_accounts_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.accounting_periods
  add constraint accounting_periods_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);
alter table public.accounting_journal_entries
  add constraint accounting_journal_entries_legal_entity_company_fk foreign key(legal_entity_id, company_id) references public.legal_entities(id, company_id);

-- Enforce entity inheritance across the commercial/accounting chain.
alter table public.sales_quotes add constraint sales_quotes_id_company_entity_unique unique(id, company_id, legal_entity_id);
alter table public.sales_orders add constraint sales_orders_id_company_entity_unique unique(id, company_id, legal_entity_id);
alter table public.finance_accounts add constraint finance_accounts_id_company_entity_unique unique(id, company_id, legal_entity_id);
alter table public.accounting_periods add constraint accounting_periods_id_company_entity_unique unique(id, company_id, legal_entity_id);

alter table public.sales_orders
  add constraint sales_orders_source_quote_entity_fk
  foreign key(source_quote_id, company_id, legal_entity_id)
  references public.sales_quotes(id, company_id, legal_entity_id);
alter table public.finance_invoices
  add constraint finance_invoices_source_order_entity_fk
  foreign key(source_sales_order_id, company_id, legal_entity_id)
  references public.sales_orders(id, company_id, legal_entity_id);
alter table public.finance_payments
  add constraint finance_payments_account_entity_fk
  foreign key(account_id, company_id, legal_entity_id)
  references public.finance_accounts(id, company_id, legal_entity_id);
alter table public.accounting_journal_entries
  add constraint accounting_journal_entries_period_entity_fk
  foreign key(period_id, company_id, legal_entity_id)
  references public.accounting_periods(id, company_id, legal_entity_id);

create index sales_quotes_entity_idx on public.sales_quotes(company_id, legal_entity_id);
create index sales_orders_entity_idx on public.sales_orders(company_id, legal_entity_id);
create index finance_accounts_entity_idx on public.finance_accounts(company_id, legal_entity_id);
create index finance_invoices_entity_idx on public.finance_invoices(company_id, legal_entity_id);
create index finance_payments_entity_idx on public.finance_payments(company_id, legal_entity_id);
create index accounting_accounts_entity_idx on public.accounting_accounts(company_id, legal_entity_id);
create index accounting_periods_entity_idx on public.accounting_periods(company_id, legal_entity_id);
create index accounting_journal_entries_entity_idx on public.accounting_journal_entries(company_id, legal_entity_id, entry_date desc);

alter table public.legal_entities enable row level security;
revoke all on table public.legal_entities from public, anon, authenticated;
grant select on table public.legal_entities to authenticated;
create policy legal_entities_read on public.legal_entities for select to authenticated using(public.is_company_member(company_id));

revoke all on function public.normalize_legal_entity() from public, anon, authenticated;
revoke all on function public.default_legal_entity_id(uuid) from public, anon, authenticated;
revoke all on function public.create_legal_entity(uuid,text,text,text,text,text,text,text,text,integer,text,boolean) from public, anon;
revoke all on function public.set_default_legal_entity(uuid,uuid) from public, anon;
grant execute on function public.create_legal_entity(uuid,text,text,text,text,text,text,text,text,integer,text,boolean) to authenticated;
grant execute on function public.set_default_legal_entity(uuid,uuid) to authenticated;

comment on table public.legal_entities is
  'Statutory/legal entities inside an Octo company workspace. Company is the tenant boundary; legal entity owns jurisdiction, functional currency and accounting activity.';