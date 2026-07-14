-- Octo Finance Integration Data Foundation V1
-- Internal receivables only. These references are not legal e-Fatura/e-Arşiv serials.

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  account_type text not null check (account_type in ('bank','cash')),
  currency text not null check (currency in ('TRY','EUR','USD','GBP')),
  iban text,
  opening_balance numeric(18,2) not null default 0,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,company_id)
);
create unique index finance_accounts_company_iban_unique on public.finance_accounts(company_id,iban) where iban is not null;
create index finance_accounts_company_idx on public.finance_accounts(company_id);
create index finance_accounts_archived_idx on public.finance_accounts(archived_at);

create table public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_number text not null check (char_length(btrim(invoice_number)) > 0),
  invoice_type text not null default 'sales' check (invoice_type in ('sales','purchase')),
  source_sales_order_id uuid,
  party_id uuid not null,
  contact_id uuid,
  opportunity_id uuid,
  owner_user_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','cancelled')),
  currency text not null check (currency in ('TRY','EUR','USD','GBP')),
  issue_date date not null default current_date,
  due_date date,
  payment_terms text,
  customer_notes text,
  internal_notes text,
  party_display_name text not null check (char_length(btrim(party_display_name)) > 0),
  party_tax_id text,
  party_tax_office text,
  party_address text,
  contact_display_name text,
  contact_email text,
  contact_phone text,
  subtotal numeric(18,2) not null check (subtotal >= 0),
  discount_total numeric(18,2) not null check (discount_total >= 0),
  tax_total numeric(18,2) not null check (tax_total >= 0),
  other_tax_total numeric(18,2) not null check (other_tax_total >= 0),
  grand_total numeric(18,2) not null check (grand_total >= 0),
  paid_amount numeric(18,2) not null default 0 check (paid_amount >= 0 and paid_amount <= grand_total),
  outstanding_amount numeric(18,2) not null check (outstanding_amount = grand_total - paid_amount),
  issued_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,invoice_number),
  unique(source_sales_order_id),
  unique(id,company_id),
  constraint finance_invoices_order_company_fk foreign key(source_sales_order_id,company_id) references public.sales_orders(id,company_id),
  constraint finance_invoices_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  constraint finance_invoices_contact_fk foreign key(contact_id) references public.business_contacts(id),
  constraint finance_invoices_opportunity_fk foreign key(opportunity_id) references public.sales_opportunities(id),
  check (due_date is null or due_date >= issue_date),
  check (status='cancelled' or ((status in ('issued','partially_paid','paid')) = (issued_at is not null))),
  check ((status='paid') = (paid_at is not null)),
  check ((status='cancelled') = (cancelled_at is not null)),
  check (status<>'cancelled' or cancellation_reason is not null)
);
create index finance_invoices_company_idx on public.finance_invoices(company_id);
create index finance_invoices_party_idx on public.finance_invoices(company_id,party_id);
create index finance_invoices_status_idx on public.finance_invoices(company_id,status);
create index finance_invoices_due_idx on public.finance_invoices(due_date);
create index finance_invoices_archived_idx on public.finance_invoices(archived_at);

create table public.finance_invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null,
  source_sales_order_item_id uuid references public.sales_order_items(id),
  position integer not null check (position > 0),
  item_code text,
  description text not null check (char_length(btrim(description)) > 0),
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null check (char_length(btrim(unit)) > 0),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  discount_type text check (discount_type is null or discount_type in ('percentage','fixed')),
  discount_value numeric(18,4) not null default 0 check (discount_value >= 0),
  vat_rate numeric(7,4) not null default 0 check (vat_rate >= 0),
  other_tax_rate numeric(7,4) not null default 0 check (other_tax_rate >= 0),
  line_subtotal numeric(18,2) not null check (line_subtotal >= 0),
  line_discount numeric(18,2) not null check (line_discount >= 0),
  line_tax numeric(18,2) not null check (line_tax >= 0),
  line_other_tax numeric(18,2) not null check (line_other_tax >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique(invoice_id,position),
  unique(invoice_id,source_sales_order_item_id),
  constraint finance_invoice_items_invoice_company_fk foreign key(invoice_id,company_id) references public.finance_invoices(id,company_id) on delete cascade
);
create index finance_invoice_items_company_idx on public.finance_invoice_items(company_id);
create index finance_invoice_items_invoice_idx on public.finance_invoice_items(invoice_id,position);

create table public.finance_invoice_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null,
  from_status text check (from_status is null or from_status in ('draft','issued','partially_paid','paid','cancelled')),
  to_status text not null check (to_status in ('draft','issued','partially_paid','paid','cancelled')),
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text,
  constraint finance_invoice_history_invoice_company_fk foreign key(invoice_id,company_id) references public.finance_invoices(id,company_id) on delete cascade
);
create index finance_invoice_history_company_idx on public.finance_invoice_status_history(company_id);
create index finance_invoice_history_invoice_idx on public.finance_invoice_status_history(invoice_id,changed_at);

create table public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_number text not null check (char_length(btrim(payment_number)) > 0),
  direction text not null default 'inflow' check (direction in ('inflow','outflow')),
  party_id uuid not null,
  account_id uuid not null,
  payment_date date not null default current_date,
  currency text not null check (currency in ('TRY','EUR','USD','GBP')),
  amount numeric(18,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('bank_transfer','cash','card','cheque','other')),
  external_reference text,
  note text,
  posted_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(company_id,payment_number),
  unique(id,company_id),
  constraint finance_payments_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  constraint finance_payments_account_company_fk foreign key(account_id,company_id) references public.finance_accounts(id,company_id)
);
create index finance_payments_company_idx on public.finance_payments(company_id);
create index finance_payments_party_idx on public.finance_payments(company_id,party_id);
create index finance_payments_account_idx on public.finance_payments(company_id,account_id);
create index finance_payments_date_idx on public.finance_payments(payment_date);

create table public.finance_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_id uuid not null,
  invoice_id uuid not null,
  allocated_amount numeric(18,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  unique(payment_id,invoice_id),
  constraint finance_allocations_payment_company_fk foreign key(payment_id,company_id) references public.finance_payments(id,company_id) on delete cascade,
  constraint finance_allocations_invoice_company_fk foreign key(invoice_id,company_id) references public.finance_invoices(id,company_id)
);
create index finance_allocations_company_idx on public.finance_payment_allocations(company_id);
create index finance_allocations_payment_idx on public.finance_payment_allocations(payment_id);
create index finance_allocations_invoice_idx on public.finance_payment_allocations(invoice_id);

create table public.finance_document_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null check (document_type in ('sales_invoice','customer_receipt')),
  calendar_year integer not null check (calendar_year between 2000 and 9999),
  next_number bigint not null default 1 check (next_number > 0),
  primary key(company_id,document_type,calendar_year)
);

create or replace function public.normalize_finance_account()
returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid();
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.company_id is distinct from old.company_id then raise exception 'Finance account company cannot change' using errcode='23514'; end if;
    if row(new.name,new.account_type,new.currency,new.iban,new.opening_balance) is distinct from row(old.name,old.account_type,old.currency,old.iban,old.opening_balance) then raise exception 'Posted finance account details are immutable' using errcode='42501'; end if;
    if new.archived_at is distinct from old.archived_at and current_setting('octo.finance_account_archive',true)<>'on' then raise exception 'Finance account archive requires controlled operation' using errcode='42501'; end if;
    new.created_by:=old.created_by; new.created_at:=old.created_at;
  else new.created_by:=actor_id; end if;
  new.name:=btrim(new.name); new.account_type:=lower(btrim(new.account_type)); new.currency:=upper(btrim(new.currency));
  new.iban:=nullif(upper(pg_catalog.regexp_replace(coalesce(new.iban,''),'[^[:alnum:]]','','g')),''); new.updated_by:=actor_id;
  return new;
end $$;

create or replace function public.normalize_finance_invoice()
returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid(); contact_party uuid; opportunity_party uuid; source_order public.sales_orders%rowtype;
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  if tg_op='INSERT' then
    new.created_by:=actor_id; new.updated_by:=actor_id;
    if new.source_sales_order_id is not null then
      select * into source_order from public.sales_orders so where so.id=new.source_sales_order_id and so.company_id=new.company_id;
      if not found or source_order.status<>'completed' or source_order.archived_at is not null then raise exception 'Sales invoice source order must be completed and active' using errcode='23514'; end if;
      if row(new.party_id,new.contact_id,new.opportunity_id,new.owner_user_id,new.currency,new.payment_terms,new.subtotal,new.discount_total,new.tax_total,new.other_tax_total,new.grand_total)
        is distinct from row(source_order.party_id,source_order.contact_id,source_order.opportunity_id,source_order.owner_user_id,source_order.currency,source_order.payment_terms,source_order.subtotal,source_order.discount_total,source_order.tax_total,source_order.other_tax_total,source_order.grand_total)
      then raise exception 'Invoice commercial snapshot must match completed sales order' using errcode='23514'; end if;
    end if;
  else
    if new.company_id is distinct from old.company_id then raise exception 'Finance invoice company cannot change' using errcode='23514'; end if;
    if row(new.invoice_number,new.invoice_type,new.source_sales_order_id,new.party_id,new.contact_id,new.opportunity_id,new.owner_user_id,new.currency,new.issue_date,new.payment_terms,new.customer_notes,new.internal_notes,new.party_display_name,new.party_tax_id,new.party_tax_office,new.party_address,new.contact_display_name,new.contact_email,new.contact_phone,new.subtotal,new.discount_total,new.tax_total,new.other_tax_total,new.grand_total)
      is distinct from row(old.invoice_number,old.invoice_type,old.source_sales_order_id,old.party_id,old.contact_id,old.opportunity_id,old.owner_user_id,old.currency,old.issue_date,old.payment_terms,old.customer_notes,old.internal_notes,old.party_display_name,old.party_tax_id,old.party_tax_office,old.party_address,old.contact_display_name,old.contact_email,old.contact_phone,old.subtotal,old.discount_total,old.tax_total,old.other_tax_total,old.grand_total)
    then raise exception 'Finance invoice snapshot is immutable' using errcode='42501'; end if;
    if row(new.status,new.paid_amount,new.outstanding_amount,new.issued_at,new.paid_at,new.cancelled_at,new.cancellation_reason,new.due_date) is distinct from row(old.status,old.paid_amount,old.outstanding_amount,old.issued_at,old.paid_at,old.cancelled_at,old.cancellation_reason,old.due_date) and current_setting('octo.finance_invoice_controlled_update',true)<>'on' then raise exception 'Finance invoice lifecycle requires controlled operation' using errcode='42501'; end if;
    if new.archived_at is distinct from old.archived_at and current_setting('octo.finance_invoice_archive',true)<>'on' then raise exception 'Finance invoice archive requires controlled operation' using errcode='42501'; end if;
    new.created_by:=old.created_by; new.created_at:=old.created_at; new.updated_by:=actor_id;
  end if;
  if new.contact_id is not null then select c.party_id into contact_party from public.business_contacts c where c.id=new.contact_id and c.company_id=new.company_id; if contact_party is distinct from new.party_id then raise exception 'Invoice contact must belong to selected party' using errcode='23514'; end if; end if;
  if new.opportunity_id is not null then select o.party_id into opportunity_party from public.sales_opportunities o where o.id=new.opportunity_id and o.company_id=new.company_id; if opportunity_party is distinct from new.party_id then raise exception 'Invoice opportunity must belong to selected party' using errcode='23514'; end if; end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=new.company_id and m.user_id=new.owner_user_id and m.status='active') then raise exception 'Invoice owner must be an active company member' using errcode='23514'; end if;
  new.payment_terms:=nullif(btrim(new.payment_terms),''); new.customer_notes:=nullif(btrim(new.customer_notes),''); new.internal_notes:=nullif(btrim(new.internal_notes),'');
  new.party_display_name:=btrim(new.party_display_name); new.party_tax_id:=nullif(btrim(new.party_tax_id),''); new.party_tax_office:=nullif(btrim(new.party_tax_office),''); new.party_address:=nullif(btrim(new.party_address),'');
  new.contact_display_name:=nullif(btrim(new.contact_display_name),''); new.contact_email:=nullif(lower(btrim(new.contact_email)),''); new.contact_phone:=nullif(btrim(new.contact_phone),''); new.cancellation_reason:=nullif(btrim(new.cancellation_reason),'');
  return new;
end $$;

create or replace function public.protect_finance_immutable_row()
returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Finance snapshot and history rows are immutable' using errcode='42501'; end $$;

create or replace function public.normalize_finance_payment()
returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid(); account_currency text; account_archived timestamptz;
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  select a.currency,a.archived_at into account_currency,account_archived from public.finance_accounts a where a.id=new.account_id and a.company_id=new.company_id;
  if account_currency is null or account_archived is not null or account_currency<>new.currency then raise exception 'Payment account must be active and use the payment currency' using errcode='23514'; end if;
  new.direction:=lower(btrim(new.direction)); new.currency:=upper(btrim(new.currency)); new.payment_method:=lower(btrim(new.payment_method));
  new.external_reference:=nullif(btrim(new.external_reference),''); new.note:=nullif(btrim(new.note),''); new.created_by:=actor_id;
  return new;
end $$;

create trigger finance_accounts_normalize before insert or update on public.finance_accounts for each row execute function public.normalize_finance_account();
create trigger finance_accounts_updated_at before update on public.finance_accounts for each row execute function public.set_updated_at();
create trigger finance_invoices_normalize before insert or update on public.finance_invoices for each row execute function public.normalize_finance_invoice();
create trigger finance_invoices_updated_at before update on public.finance_invoices for each row execute function public.set_updated_at();
create trigger finance_invoice_items_immutable before update or delete on public.finance_invoice_items for each row execute function public.protect_finance_immutable_row();
create trigger finance_invoice_history_immutable before update or delete on public.finance_invoice_status_history for each row execute function public.protect_finance_immutable_row();
create trigger finance_payments_normalize before insert on public.finance_payments for each row execute function public.normalize_finance_payment();
create trigger finance_payments_immutable before update or delete on public.finance_payments for each row execute function public.protect_finance_immutable_row();
create trigger finance_allocations_immutable before update or delete on public.finance_payment_allocations for each row execute function public.protect_finance_immutable_row();

create or replace function public.next_finance_document_number(target_company_id uuid,target_document_type text,target_date date)
returns text language plpgsql security definer set search_path='' as $$
declare target_year integer:=extract(year from target_date); allocated bigint; prefix text;
begin
  if target_document_type not in ('sales_invoice','customer_receipt') then raise exception 'Unsupported finance document type' using errcode='22023'; end if;
  insert into public.finance_document_number_counters(company_id,document_type,calendar_year,next_number) values(target_company_id,target_document_type,target_year,2)
  on conflict(company_id,document_type,calendar_year) do update set next_number=public.finance_document_number_counters.next_number+1 returning next_number-1 into allocated;
  prefix:=case target_document_type when 'sales_invoice' then 'FTR-' else 'THS-' end;
  return prefix||target_year::text||'-'||lpad(allocated::text,6,'0');
end $$;

create or replace function public.create_sales_invoice_from_sales_order(
  target_company_id uuid,target_sales_order_id uuid,requested_issue_date date default current_date,requested_due_date date default null,requested_customer_note text default null,requested_internal_note text default null
) returns table(invoice_id uuid,invoice_number text) language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); order_row public.sales_orders%rowtype; party_row public.business_parties%rowtype; contact_row public.business_contacts%rowtype; created_id uuid; created_number text; copied integer;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if requested_issue_date is null or requested_due_date is null or requested_due_date<requested_issue_date then raise exception 'A valid invoice due date is required' using errcode='22023'; end if;
  select * into order_row from public.sales_orders so where so.id=target_sales_order_id and so.company_id=target_company_id for update;
  if not found then raise exception 'Sales order was not found' using errcode='P0002'; end if;
  if order_row.archived_at is not null then raise exception 'Archived sales order cannot be invoiced' using errcode='23514'; end if;
  if order_row.status='cancelled' then raise exception 'Cancelled sales order cannot be invoiced' using errcode='23514'; end if;
  if order_row.status<>'completed' then raise exception 'Only completed sales orders can be invoiced' using errcode='23514'; end if;
  if exists(select 1 from public.finance_invoices fi where fi.source_sales_order_id=order_row.id) then raise exception 'Sales order already has an invoice' using errcode='23505'; end if;
  select * into party_row from public.business_parties p where p.id=order_row.party_id and p.company_id=target_company_id;
  if order_row.contact_id is not null then select * into contact_row from public.business_contacts c where c.id=order_row.contact_id and c.company_id=target_company_id; end if;
  created_number:=public.next_finance_document_number(target_company_id,'sales_invoice',requested_issue_date);
  insert into public.finance_invoices(company_id,invoice_number,invoice_type,source_sales_order_id,party_id,contact_id,opportunity_id,owner_user_id,status,currency,issue_date,due_date,payment_terms,customer_notes,internal_notes,party_display_name,party_tax_id,party_tax_office,party_address,contact_display_name,contact_email,contact_phone,subtotal,discount_total,tax_total,other_tax_total,grand_total,paid_amount,outstanding_amount,created_by,updated_by)
  values(target_company_id,created_number,'sales',order_row.id,order_row.party_id,order_row.contact_id,order_row.opportunity_id,order_row.owner_user_id,'draft',order_row.currency,requested_issue_date,requested_due_date,order_row.payment_terms,coalesce(nullif(btrim(requested_customer_note),''),order_row.customer_notes),nullif(btrim(requested_internal_note),''),party_row.display_name,party_row.tax_id,party_row.tax_office,party_row.address,case when contact_row.id is null then null else concat_ws(' ',contact_row.first_name,contact_row.last_name) end,contact_row.email,contact_row.phone,order_row.subtotal,order_row.discount_total,order_row.tax_total,order_row.other_tax_total,order_row.grand_total,0,order_row.grand_total,actor_id,actor_id) returning id into created_id;
  insert into public.finance_invoice_items(company_id,invoice_id,source_sales_order_item_id,position,item_code,description,quantity,unit,unit_price,discount_type,discount_value,vat_rate,other_tax_rate,line_subtotal,line_discount,line_tax,line_other_tax,line_total)
  select target_company_id,created_id,oi.id,oi.position,oi.item_code,oi.description,oi.ordered_quantity,oi.unit,oi.unit_price,oi.discount_type,oi.discount_value,oi.vat_rate,oi.other_tax_rate,oi.line_subtotal,oi.line_discount,oi.line_tax,oi.line_other_tax,oi.line_total from public.sales_order_items oi where oi.sales_order_id=order_row.id and oi.company_id=target_company_id order by oi.position;
  get diagnostics copied=row_count; if copied=0 then raise exception 'Sales order has no items' using errcode='23514'; end if;
  insert into public.finance_invoice_status_history(company_id,invoice_id,from_status,to_status,changed_by,reason) values(target_company_id,created_id,null,'draft',actor_id,'Sales order converted to internal invoice');
  return query select created_id,created_number;
end $$;

create or replace function public.transition_finance_invoice_status(target_company_id uuid,target_invoice_id uuid,destination_status text,transition_reason text default null)
returns public.finance_invoices language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); invoice_row public.finance_invoices%rowtype; updated_row public.finance_invoices%rowtype; valid boolean;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into invoice_row from public.finance_invoices fi where fi.id=target_invoice_id and fi.company_id=target_company_id for update;
  if not found then raise exception 'Finance invoice was not found' using errcode='P0002'; end if;
  if invoice_row.archived_at is not null then raise exception 'Archived invoice cannot transition' using errcode='23514'; end if;
  valid:=case invoice_row.status when 'draft' then destination_status in ('issued','cancelled') when 'issued' then destination_status='cancelled' else false end;
  if not valid then raise exception 'Invalid invoice status transition' using errcode='23514'; end if;
  if destination_status='issued' and invoice_row.due_date is null then raise exception 'Invoice due date is required before issue' using errcode='23514'; end if;
  if destination_status='cancelled' and nullif(btrim(transition_reason),'') is null then raise exception 'Cancellation reason is required' using errcode='22023'; end if;
  if destination_status='cancelled' and exists(select 1 from public.finance_payment_allocations a where a.invoice_id=invoice_row.id) then raise exception 'Invoice with payment allocations cannot be cancelled' using errcode='23514'; end if;
  perform set_config('octo.finance_invoice_controlled_update','on',true);
  update public.finance_invoices set status=destination_status,issued_at=case when destination_status='issued' then now() else issued_at end,cancelled_at=case when destination_status='cancelled' then now() else null end,cancellation_reason=case when destination_status='cancelled' then nullif(btrim(transition_reason),'') else null end where id=invoice_row.id returning * into updated_row;
  perform set_config('octo.finance_invoice_controlled_update','',true);
  insert into public.finance_invoice_status_history(company_id,invoice_id,from_status,to_status,changed_by,reason) values(target_company_id,invoice_row.id,invoice_row.status,destination_status,actor_id,nullif(btrim(transition_reason),''));
  return updated_row;
end $$;

create or replace function public.record_customer_collection(target_company_id uuid,target_party_id uuid,target_account_id uuid,requested_payment_date date,requested_payment_method text,requested_external_reference text default null,requested_note text default null,allocations jsonb default '[]'::jsonb)
returns table(payment_id uuid,payment_number text,amount numeric,affected_invoices jsonb) language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); account_row public.finance_accounts%rowtype; invoice_row public.finance_invoices%rowtype; allocation jsonb; common_currency text; total_amount numeric(18,2):=0; allocation_amount numeric(18,2); created_id uuid; created_number text; results jsonb:='[]'::jsonb; next_status text;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if requested_payment_date is null or jsonb_typeof(allocations)<>'array' or jsonb_array_length(allocations)=0 then raise exception 'At least one payment allocation is required' using errcode='22023'; end if;
  if exists(select 1 from (select value->>'invoice_id' id,count(*) from jsonb_array_elements(allocations) group by value->>'invoice_id' having count(*)>1) duplicates) then raise exception 'Allocation invoice IDs must be unique' using errcode='22023'; end if;
  select * into account_row from public.finance_accounts a where a.id=target_account_id and a.company_id=target_company_id and a.archived_at is null for update;
  if not found then raise exception 'Active finance account was not found' using errcode='P0002'; end if;
  for allocation in select value from jsonb_array_elements(allocations) order by value->>'invoice_id' loop
    allocation_amount:=(allocation->>'allocated_amount')::numeric;
    if allocation_amount is null or allocation_amount<=0 then raise exception 'Allocated amount must be greater than zero' using errcode='22023'; end if;
    select * into invoice_row from public.finance_invoices fi where fi.id=(allocation->>'invoice_id')::uuid and fi.company_id=target_company_id for update;
    if not found or invoice_row.party_id<>target_party_id then raise exception 'Collection invoice must belong to selected party and company' using errcode='23514'; end if;
    if invoice_row.status not in ('issued','partially_paid') or invoice_row.archived_at is not null then raise exception 'Only active issued invoices can receive collections' using errcode='23514'; end if;
    if common_currency is null then common_currency:=invoice_row.currency; elsif common_currency<>invoice_row.currency then raise exception 'Collection invoices must use one currency' using errcode='23514'; end if;
    if allocation_amount>invoice_row.outstanding_amount then raise exception 'Allocation exceeds invoice outstanding amount' using errcode='23514'; end if;
    total_amount:=total_amount+allocation_amount;
  end loop;
  if account_row.currency<>common_currency then raise exception 'Finance account currency must match invoice currency' using errcode='23514'; end if;
  created_number:=public.next_finance_document_number(target_company_id,'customer_receipt',requested_payment_date);
  insert into public.finance_payments(company_id,payment_number,direction,party_id,account_id,payment_date,currency,amount,payment_method,external_reference,note,created_by)
  values(target_company_id,created_number,'inflow',target_party_id,target_account_id,requested_payment_date,common_currency,total_amount,requested_payment_method,requested_external_reference,requested_note,actor_id) returning id into created_id;
  for allocation in select value from jsonb_array_elements(allocations) order by value->>'invoice_id' loop
    allocation_amount:=(allocation->>'allocated_amount')::numeric;
    select * into invoice_row from public.finance_invoices fi where fi.id=(allocation->>'invoice_id')::uuid and fi.company_id=target_company_id for update;
    insert into public.finance_payment_allocations(company_id,payment_id,invoice_id,allocated_amount) values(target_company_id,created_id,invoice_row.id,allocation_amount);
    next_status:=case when invoice_row.outstanding_amount-allocation_amount=0 then 'paid' else 'partially_paid' end;
    perform set_config('octo.finance_invoice_controlled_update','on',true);
    update public.finance_invoices set paid_amount=paid_amount+allocation_amount,outstanding_amount=outstanding_amount-allocation_amount,status=next_status,paid_at=case when next_status='paid' then now() else null end where id=invoice_row.id;
    perform set_config('octo.finance_invoice_controlled_update','',true);
    if invoice_row.status<>next_status then insert into public.finance_invoice_status_history(company_id,invoice_id,from_status,to_status,changed_by,reason) values(target_company_id,invoice_row.id,invoice_row.status,next_status,actor_id,'Customer collection allocated'); end if;
    results:=results||jsonb_build_array(jsonb_build_object('invoice_id',invoice_row.id,'status',next_status));
  end loop;
  return query select created_id,created_number,total_amount,results;
end $$;

create or replace function public.create_finance_account(target_company_id uuid,account_name text,account_type_value text,account_currency text,account_iban text default null,account_opening_balance numeric default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); created_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if nullif(btrim(account_name),'') is null or lower(btrim(account_type_value)) not in ('bank','cash') or upper(btrim(account_currency)) not in ('TRY','EUR','USD','GBP') then raise exception 'Finance account fields are invalid' using errcode='22023'; end if;
  insert into public.finance_accounts(company_id,name,account_type,currency,iban,opening_balance,created_by,updated_by) values(target_company_id,account_name,account_type_value,account_currency,account_iban,coalesce(account_opening_balance,0),actor_id,actor_id) returning id into created_id;
  return created_id;
end $$;

create or replace function public.archive_finance_account(target_company_id uuid,target_account_id uuid)
returns public.finance_accounts language plpgsql security definer set search_path='' as $$
declare archived_row public.finance_accounts%rowtype;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if exists(select 1 from public.finance_payments p where p.company_id=target_company_id and p.account_id=target_account_id) then raise exception 'Finance account with payments cannot be archived' using errcode='23514'; end if;
  perform set_config('octo.finance_account_archive','on',true); update public.finance_accounts set archived_at=now() where id=target_account_id and company_id=target_company_id and archived_at is null returning * into archived_row; perform set_config('octo.finance_account_archive','',true);
  if archived_row.id is null then raise exception 'Active finance account was not found' using errcode='P0002'; end if; return archived_row;
end $$;

create or replace function public.archive_finance_invoice(target_company_id uuid,target_invoice_id uuid)
returns public.finance_invoices language plpgsql security definer set search_path='' as $$
declare archived_row public.finance_invoices%rowtype;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if exists(select 1 from public.finance_payment_allocations a where a.company_id=target_company_id and a.invoice_id=target_invoice_id) then raise exception 'Invoice with allocations cannot be archived' using errcode='23514'; end if;
  perform set_config('octo.finance_invoice_archive','on',true); update public.finance_invoices set archived_at=now() where id=target_invoice_id and company_id=target_company_id and status='draft' and archived_at is null returning * into archived_row; perform set_config('octo.finance_invoice_archive','',true);
  if archived_row.id is null then raise exception 'Only an active draft invoice can be archived' using errcode='23514'; end if; return archived_row;
end $$;

revoke all on function public.normalize_finance_account(),public.normalize_finance_invoice(),public.protect_finance_immutable_row(),public.normalize_finance_payment() from public,anon,authenticated;
revoke all on function public.next_finance_document_number(uuid,text,date) from public,anon,authenticated;
revoke all on function public.create_sales_invoice_from_sales_order(uuid,uuid,date,date,text,text),public.transition_finance_invoice_status(uuid,uuid,text,text),public.record_customer_collection(uuid,uuid,uuid,date,text,text,text,jsonb),public.create_finance_account(uuid,text,text,text,text,numeric),public.archive_finance_account(uuid,uuid),public.archive_finance_invoice(uuid,uuid) from public,anon;
grant execute on function public.create_sales_invoice_from_sales_order(uuid,uuid,date,date,text,text),public.transition_finance_invoice_status(uuid,uuid,text,text),public.record_customer_collection(uuid,uuid,uuid,date,text,text,text,jsonb),public.create_finance_account(uuid,text,text,text,text,numeric),public.archive_finance_account(uuid,uuid),public.archive_finance_invoice(uuid,uuid) to authenticated;

alter table public.finance_accounts enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_invoice_items enable row level security;
alter table public.finance_invoice_status_history enable row level security;
alter table public.finance_payments enable row level security;
alter table public.finance_payment_allocations enable row level security;
alter table public.finance_document_number_counters enable row level security;

revoke all on table public.finance_accounts,public.finance_invoices,public.finance_invoice_items,public.finance_invoice_status_history,public.finance_payments,public.finance_payment_allocations,public.finance_document_number_counters from public,anon,authenticated;
grant select on table public.finance_accounts,public.finance_invoices,public.finance_invoice_items,public.finance_invoice_status_history,public.finance_payments,public.finance_payment_allocations to authenticated;
create policy finance_accounts_read on public.finance_accounts for select to authenticated using(public.is_company_member(company_id));
create policy finance_invoices_read on public.finance_invoices for select to authenticated using(public.is_company_member(company_id));
create policy finance_invoice_items_read on public.finance_invoice_items for select to authenticated using(public.is_company_member(company_id));
create policy finance_invoice_history_read on public.finance_invoice_status_history for select to authenticated using(public.is_company_member(company_id));
create policy finance_payments_read on public.finance_payments for select to authenticated using(public.is_company_member(company_id));
create policy finance_allocations_read on public.finance_payment_allocations for select to authenticated using(public.is_company_member(company_id));

comment on table public.finance_invoices is 'Internal Octo receivables linked by canonical business party ID; not a legal e-invoice record.';
comment on table public.finance_payments is 'Immutable internal customer collections; V1 has no reversal workflow.';
