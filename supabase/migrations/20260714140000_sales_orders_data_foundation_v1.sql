-- Octo Sales Orders Data Foundation V1

alter table public.sales_quote_versions
  add constraint sales_quote_versions_id_quote_company_unique unique (id, quote_id, company_id);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_number text not null check (char_length(btrim(order_number)) > 0),
  source_quote_id uuid not null,
  source_quote_version_id uuid not null,
  party_id uuid not null,
  contact_id uuid,
  opportunity_id uuid,
  owner_user_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft','confirmed','in_preparation','partially_fulfilled','completed','cancelled')),
  currency text not null check (currency in ('TRY','EUR','USD','GBP')),
  order_date date not null default current_date,
  expected_delivery_date date,
  confirmed_at timestamptz,
  preparation_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_terms text,
  delivery_terms text,
  customer_notes text,
  internal_notes text,
  subtotal numeric(18,2) not null check (subtotal >= 0),
  discount_total numeric(18,2) not null check (discount_total >= 0),
  tax_total numeric(18,2) not null check (tax_total >= 0),
  other_tax_total numeric(18,2) not null check (other_tax_total >= 0),
  grand_total numeric(18,2) not null check (grand_total >= 0),
  total_cost numeric(18,2) check (total_cost is null or total_cost >= 0),
  gross_margin numeric(18,2),
  gross_margin_pct numeric(9,4),
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number),
  unique (source_quote_id),
  unique (id, company_id),
  constraint sales_orders_quote_company_fk foreign key (source_quote_id, company_id) references public.sales_quotes(id, company_id),
  constraint sales_orders_version_quote_company_fk foreign key (source_quote_version_id, source_quote_id, company_id) references public.sales_quote_versions(id, quote_id, company_id),
  constraint sales_orders_party_company_fk foreign key (party_id, company_id) references public.business_parties(id, company_id),
  constraint sales_orders_contact_company_fk foreign key (contact_id, company_id) references public.business_contacts(id, company_id),
  constraint sales_orders_opportunity_company_fk foreign key (opportunity_id, company_id) references public.sales_opportunities(id, company_id),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (status <> 'cancelled' or cancellation_reason is not null)
);

create index sales_orders_company_idx on public.sales_orders(company_id);
create index sales_orders_party_idx on public.sales_orders(company_id, party_id);
create index sales_orders_opportunity_idx on public.sales_orders(company_id, opportunity_id);
create index sales_orders_status_idx on public.sales_orders(company_id, status);
create index sales_orders_owner_idx on public.sales_orders(company_id, owner_user_id);
create index sales_orders_delivery_idx on public.sales_orders(expected_delivery_date);
create index sales_orders_archived_idx on public.sales_orders(archived_at);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sales_order_id uuid not null,
  source_quote_item_id uuid not null references public.sales_quote_items(id),
  position integer not null check (position > 0),
  item_code text,
  description text not null check (char_length(btrim(description)) > 0),
  ordered_quantity numeric(18,4) not null check (ordered_quantity > 0),
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
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  line_cost numeric(18,2) check (line_cost is null or line_cost >= 0),
  line_margin numeric(18,2),
  line_margin_pct numeric(9,4),
  created_at timestamptz not null default now(),
  unique (sales_order_id, position),
  unique (sales_order_id, source_quote_item_id),
  unique (id, sales_order_id, company_id),
  constraint sales_order_items_order_company_fk foreign key (sales_order_id, company_id) references public.sales_orders(id, company_id) on delete cascade,
  check (discount_type is not null or discount_value = 0),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create index sales_order_items_company_idx on public.sales_order_items(company_id);
create index sales_order_items_order_idx on public.sales_order_items(sales_order_id, position);

create table public.sales_order_fulfillments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sales_order_id uuid not null,
  fulfillment_number integer not null check (fulfillment_number > 0),
  fulfilled_at timestamptz not null default now(),
  delivery_reference text,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (sales_order_id, fulfillment_number),
  unique (id, company_id),
  unique (id, sales_order_id, company_id),
  constraint sales_order_fulfillments_order_company_fk foreign key (sales_order_id, company_id) references public.sales_orders(id, company_id) on delete cascade
);

create index sales_order_fulfillments_company_idx on public.sales_order_fulfillments(company_id);
create index sales_order_fulfillments_order_idx on public.sales_order_fulfillments(sales_order_id, fulfillment_number);

create table public.sales_order_fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fulfillment_id uuid not null,
  sales_order_item_id uuid not null,
  fulfilled_quantity numeric(18,4) not null check (fulfilled_quantity > 0),
  created_at timestamptz not null default now(),
  unique (fulfillment_id, sales_order_item_id),
  constraint sales_order_fulfillment_header_company_fk foreign key (fulfillment_id, company_id) references public.sales_order_fulfillments(id, company_id) on delete cascade,
  constraint sales_order_fulfillment_order_item_fk foreign key (sales_order_item_id) references public.sales_order_items(id)
);

create index sales_order_fulfillment_items_company_idx on public.sales_order_fulfillment_items(company_id);
create index sales_order_fulfillment_items_header_idx on public.sales_order_fulfillment_items(fulfillment_id);
create index sales_order_fulfillment_items_order_item_idx on public.sales_order_fulfillment_items(sales_order_item_id);

create table public.sales_order_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sales_order_id uuid not null,
  from_status text check (from_status is null or from_status in ('draft','confirmed','in_preparation','partially_fulfilled','completed','cancelled')),
  to_status text not null check (to_status in ('draft','confirmed','in_preparation','partially_fulfilled','completed','cancelled')),
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text,
  constraint sales_order_history_order_company_fk foreign key (sales_order_id, company_id) references public.sales_orders(id, company_id) on delete cascade
);

create index sales_order_history_company_idx on public.sales_order_status_history(company_id);
create index sales_order_history_order_idx on public.sales_order_status_history(sales_order_id, changed_at desc);

create table public.sales_order_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 2000 and 9999),
  next_number bigint not null default 1 check (next_number > 0),
  primary key (company_id, calendar_year)
);

create or replace function public.normalize_sales_order()
returns trigger language plpgsql set search_path = '' as $$
declare actor_id uuid := auth.uid(); contact_party_id uuid; opportunity_party_id uuid; source_quote public.sales_quotes%rowtype; source_version public.sales_quote_versions%rowtype;
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  if tg_op='INSERT' then
    select * into source_quote from public.sales_quotes q where q.id=new.source_quote_id and q.company_id=new.company_id;
    if not found or source_quote.status<>'accepted' or source_quote.archived_at is not null then raise exception 'Sales order source quotation must be accepted and active' using errcode='23514'; end if;
    select * into source_version from public.sales_quote_versions v where v.id=new.source_quote_version_id and v.quote_id=source_quote.id and v.company_id=new.company_id and v.is_current;
    if not found or source_quote.current_version_id is distinct from source_version.id then raise exception 'Sales order source must be the accepted current quotation version' using errcode='23514'; end if;
    if row(new.party_id,new.contact_id,new.opportunity_id,new.owner_user_id,new.currency,new.payment_terms,new.delivery_terms,new.customer_notes,new.subtotal,new.discount_total,new.tax_total,new.other_tax_total,new.grand_total,new.total_cost,new.gross_margin,new.gross_margin_pct)
      is distinct from row(source_quote.party_id,source_quote.contact_id,source_quote.opportunity_id,source_quote.owner_user_id,source_quote.currency,source_quote.payment_terms,source_quote.delivery_terms,source_quote.customer_notes,source_version.subtotal,source_version.discount_total,source_version.tax_total,source_version.other_tax_total,source_version.grand_total,source_version.total_cost,source_version.gross_margin,source_version.gross_margin_pct)
    then raise exception 'Sales order commercial snapshot must match accepted quotation' using errcode='23514'; end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.company_id <> old.company_id then raise exception 'Sales order company cannot change' using errcode='23514'; end if;
    if new.status <> old.status and current_setting('octo.sales_order_status_transition', true) <> 'on' then raise exception 'Sales order status requires controlled transition' using errcode='42501'; end if;
    if row(new.confirmed_at,new.preparation_started_at,new.completed_at,new.cancelled_at,new.cancellation_reason) is distinct from row(old.confirmed_at,old.preparation_started_at,old.completed_at,old.cancelled_at,old.cancellation_reason) and current_setting('octo.sales_order_status_transition', true) <> 'on' then raise exception 'Sales order operational timestamps require controlled transition' using errcode='42501'; end if;
    if new.archived_at is distinct from old.archived_at and current_setting('octo.sales_order_archive', true) <> 'on' then raise exception 'Sales order archive requires controlled operation' using errcode='42501'; end if;
    if row(new.order_number,new.source_quote_id,new.source_quote_version_id,new.party_id,new.contact_id,new.opportunity_id,new.owner_user_id,new.currency,new.order_date,new.expected_delivery_date,new.payment_terms,new.delivery_terms,new.customer_notes,new.internal_notes,new.subtotal,new.discount_total,new.tax_total,new.other_tax_total,new.grand_total,new.total_cost,new.gross_margin,new.gross_margin_pct)
      is distinct from row(old.order_number,old.source_quote_id,old.source_quote_version_id,old.party_id,old.contact_id,old.opportunity_id,old.owner_user_id,old.currency,old.order_date,old.expected_delivery_date,old.payment_terms,old.delivery_terms,old.customer_notes,old.internal_notes,old.subtotal,old.discount_total,old.tax_total,old.other_tax_total,old.grand_total,old.total_cost,old.gross_margin,old.gross_margin_pct)
    then raise exception 'Sales order commercial snapshot is immutable' using errcode='42501'; end if;
  end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=new.company_id and m.user_id=new.owner_user_id and m.status='active') then raise exception 'Sales order owner must be an active company member' using errcode='23514'; end if;
  if new.contact_id is not null then select c.party_id into contact_party_id from public.business_contacts c where c.id=new.contact_id and c.company_id=new.company_id; if contact_party_id is distinct from new.party_id then raise exception 'Sales order contact must belong to selected party' using errcode='23514'; end if; end if;
  if new.opportunity_id is not null then select o.party_id into opportunity_party_id from public.sales_opportunities o where o.id=new.opportunity_id and o.company_id=new.company_id; if opportunity_party_id is distinct from new.party_id then raise exception 'Sales order opportunity must belong to selected party' using errcode='23514'; end if; end if;
  new.cancellation_reason:=nullif(btrim(new.cancellation_reason),''); new.payment_terms:=nullif(btrim(new.payment_terms),''); new.delivery_terms:=nullif(btrim(new.delivery_terms),'');
  new.customer_notes:=nullif(btrim(new.customer_notes),''); new.internal_notes:=nullif(btrim(new.internal_notes),'');
  if tg_op='INSERT' then new.created_by:=actor_id; end if; new.updated_by:=actor_id;
  return new;
end $$;

create or replace function public.protect_sales_order_item()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Sales order items are immutable' using errcode='42501'; end $$;
create or replace function public.protect_sales_order_fulfillment()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Sales order fulfillments are append-only' using errcode='42501'; end $$;
create or replace function public.protect_sales_order_history()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Sales order history is append-only' using errcode='42501'; end $$;

create or replace function public.validate_sales_order_fulfillment_item()
returns trigger language plpgsql set search_path = '' as $$
declare fulfillment_order_id uuid; fulfillment_company_id uuid; item_order_id uuid; item_company_id uuid; ordered_amount numeric; fulfilled_amount numeric;
begin
  if auth.uid() is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  select f.sales_order_id,f.company_id into fulfillment_order_id,fulfillment_company_id from public.sales_order_fulfillments f where f.id=new.fulfillment_id;
  select oi.sales_order_id,oi.company_id,oi.ordered_quantity into item_order_id,item_company_id,ordered_amount from public.sales_order_items oi where oi.id=new.sales_order_item_id for update;
  if fulfillment_order_id is null or item_order_id is null or fulfillment_order_id is distinct from item_order_id or fulfillment_company_id is distinct from item_company_id or new.company_id is distinct from item_company_id then raise exception 'Fulfillment item must belong to the same order and company' using errcode='23514'; end if;
  select coalesce(sum(fi.fulfilled_quantity),0) into fulfilled_amount from public.sales_order_fulfillment_items fi where fi.sales_order_item_id=new.sales_order_item_id;
  if fulfilled_amount+new.fulfilled_quantity>ordered_amount then raise exception 'Fulfilled quantity exceeds ordered quantity' using errcode='23514'; end if;
  return new;
end $$;

create trigger sales_orders_normalize before insert or update on public.sales_orders for each row execute function public.normalize_sales_order();
create trigger sales_orders_updated_at before update on public.sales_orders for each row execute function public.set_updated_at();
create trigger sales_order_items_immutable before update or delete on public.sales_order_items for each row execute function public.protect_sales_order_item();
create trigger sales_order_fulfillments_immutable before update or delete on public.sales_order_fulfillments for each row execute function public.protect_sales_order_fulfillment();
create trigger sales_order_fulfillment_items_immutable before update or delete on public.sales_order_fulfillment_items for each row execute function public.protect_sales_order_fulfillment();
create trigger sales_order_fulfillment_items_validate before insert on public.sales_order_fulfillment_items for each row execute function public.validate_sales_order_fulfillment_item();
create trigger sales_order_history_immutable before update or delete on public.sales_order_status_history for each row execute function public.protect_sales_order_history();

create or replace function public.next_sales_order_number(target_company_id uuid, target_order_date date)
returns text language plpgsql security definer set search_path = '' as $$
declare target_year integer:=extract(year from target_order_date); allocated_number bigint;
begin
  insert into public.sales_order_number_counters(company_id,calendar_year,next_number) values(target_company_id,target_year,2)
  on conflict(company_id,calendar_year) do update set next_number=public.sales_order_number_counters.next_number+1
  returning next_number-1 into allocated_number;
  return 'SS-'||target_year::text||'-'||lpad(allocated_number::text,6,'0');
end $$;

create or replace function public.convert_accepted_quote_to_sales_order(
  target_company_id uuid, accepted_quote_id uuid, requested_order_date date default current_date,
  requested_expected_delivery_date date default null, requested_internal_note text default null
) returns table(sales_order_id uuid,sales_order_number text)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); quote_row public.sales_quotes%rowtype; version_row public.sales_quote_versions%rowtype;
  created_order_id uuid; created_order_number text; copied_item_count integer;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into quote_row from public.sales_quotes q where q.id=accepted_quote_id and q.company_id=target_company_id for update;
  if not found then raise exception 'Accepted quotation was not found' using errcode='P0002'; end if;
  if quote_row.archived_at is not null then raise exception 'Archived quotation cannot be converted' using errcode='23514'; end if;
  if quote_row.status<>'accepted' then raise exception 'Only accepted quotations can be converted' using errcode='23514'; end if;
  if quote_row.current_version_id is null then raise exception 'Accepted quotation has no current version' using errcode='23514'; end if;
  if exists(select 1 from public.sales_orders so where so.source_quote_id=quote_row.id) then raise exception 'Accepted quotation already has a sales order' using errcode='23505'; end if;
  select * into version_row from public.sales_quote_versions v where v.id=quote_row.current_version_id and v.quote_id=quote_row.id and v.company_id=target_company_id and v.is_current for share;
  if not found then raise exception 'Accepted quotation current version is invalid' using errcode='23514'; end if;
  if not exists(select 1 from public.sales_quote_items qi where qi.quote_version_id=version_row.id and qi.company_id=target_company_id) then raise exception 'Accepted quotation has no items' using errcode='23514'; end if;
  created_order_number:=public.next_sales_order_number(target_company_id,coalesce(requested_order_date,current_date));
  insert into public.sales_orders(company_id,order_number,source_quote_id,source_quote_version_id,party_id,contact_id,opportunity_id,owner_user_id,status,currency,order_date,expected_delivery_date,payment_terms,delivery_terms,customer_notes,internal_notes,subtotal,discount_total,tax_total,other_tax_total,grand_total,total_cost,gross_margin,gross_margin_pct,created_by,updated_by)
  values(target_company_id,created_order_number,quote_row.id,version_row.id,quote_row.party_id,quote_row.contact_id,quote_row.opportunity_id,quote_row.owner_user_id,'draft',quote_row.currency,coalesce(requested_order_date,current_date),coalesce(requested_expected_delivery_date,quote_row.expected_delivery_date),quote_row.payment_terms,quote_row.delivery_terms,quote_row.customer_notes,coalesce(nullif(btrim(requested_internal_note),''),quote_row.internal_notes),version_row.subtotal,version_row.discount_total,version_row.tax_total,version_row.other_tax_total,version_row.grand_total,version_row.total_cost,version_row.gross_margin,version_row.gross_margin_pct,actor_id,actor_id)
  returning id into created_order_id;
  insert into public.sales_order_items(company_id,sales_order_id,source_quote_item_id,position,item_code,description,ordered_quantity,unit,unit_price,discount_type,discount_value,vat_rate,other_tax_rate,line_subtotal,line_discount,line_tax,line_other_tax,line_total,unit_cost,line_cost,line_margin,line_margin_pct)
  select target_company_id,created_order_id,qi.id,qi.position,qi.item_code,qi.description,qi.quantity,qi.unit,qi.unit_price,qi.discount_type,qi.discount_value,qi.vat_rate,qi.other_tax_rate,qi.line_subtotal,qi.line_discount,qi.line_tax,qi.line_other_tax,qi.line_total,qi.unit_cost,qi.line_cost,qi.line_margin,qi.line_margin_pct
  from public.sales_quote_items qi where qi.quote_version_id=version_row.id and qi.company_id=target_company_id order by qi.position;
  get diagnostics copied_item_count=row_count;
  if copied_item_count=0 then raise exception 'Accepted quotation items were not copied' using errcode='23514'; end if;
  insert into public.sales_order_status_history(company_id,sales_order_id,from_status,to_status,changed_by) values(target_company_id,created_order_id,null,'draft',actor_id);
  return query select created_order_id,created_order_number;
end $$;

create or replace function public.sales_order_is_fully_fulfilled(target_order_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists(select 1 from public.sales_order_items oi where oi.sales_order_id=target_order_id)
    and not exists(
      select 1 from public.sales_order_items oi
      where oi.sales_order_id=target_order_id
        and coalesce((select sum(fi.fulfilled_quantity) from public.sales_order_fulfillment_items fi where fi.sales_order_item_id=oi.id),0) < oi.ordered_quantity
    );
$$;

create or replace function public.transition_sales_order_status(target_company_id uuid,target_sales_order_id uuid,destination_status text,transition_reason text default null)
returns public.sales_orders language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); order_row public.sales_orders%rowtype; updated_order public.sales_orders%rowtype; allowed boolean:=false; normalized_reason text:=nullif(btrim(transition_reason),'');
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into order_row from public.sales_orders so where so.id=target_sales_order_id and so.company_id=target_company_id for update;
  if not found then raise exception 'Sales order was not found' using errcode='P0002'; end if;
  if order_row.archived_at is not null then raise exception 'Archived sales order cannot transition' using errcode='23514'; end if;
  if order_row.status=destination_status and destination_status='partially_fulfilled' then return order_row; end if;
  allowed:=case order_row.status when 'draft' then destination_status in ('confirmed','cancelled') when 'confirmed' then destination_status in ('in_preparation','cancelled') when 'in_preparation' then destination_status in ('partially_fulfilled','completed','cancelled') when 'partially_fulfilled' then destination_status in ('completed','cancelled') else false end;
  if not allowed then raise exception 'Invalid sales order status transition' using errcode='23514'; end if;
  if destination_status='cancelled' and normalized_reason is null then raise exception 'Cancellation reason is required' using errcode='23514'; end if;
  if destination_status='completed' and not public.sales_order_is_fully_fulfilled(order_row.id) then raise exception 'Sales order cannot complete before full fulfillment' using errcode='23514'; end if;
  perform set_config('octo.sales_order_status_transition','on',true);
  update public.sales_orders set status=destination_status,
    confirmed_at=case when destination_status='confirmed' then coalesce(confirmed_at,now()) else confirmed_at end,
    preparation_started_at=case when destination_status='in_preparation' then coalesce(preparation_started_at,now()) else preparation_started_at end,
    completed_at=case when destination_status='completed' then now() else null end,
    cancelled_at=case when destination_status='cancelled' then now() else null end,
    cancellation_reason=case when destination_status='cancelled' then normalized_reason else null end
  where id=order_row.id returning * into updated_order;
  perform set_config('octo.sales_order_status_transition','',true);
  insert into public.sales_order_status_history(company_id,sales_order_id,from_status,to_status,changed_by,reason) values(target_company_id,order_row.id,order_row.status,destination_status,actor_id,normalized_reason);
  return updated_order;
end $$;

create or replace function public.record_sales_order_fulfillment(
  target_company_id uuid,target_sales_order_id uuid,requested_fulfilled_at timestamptz default now(),
  requested_delivery_reference text default null,requested_note text default null,fulfilled_items jsonb default '[]'::jsonb
) returns table(fulfillment_id uuid,fulfillment_number integer,resulting_status text)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); order_row public.sales_orders%rowtype; item_payload jsonb; order_item public.sales_order_items%rowtype;
  created_fulfillment_id uuid; next_fulfillment_number integer; requested_quantity numeric; already_fulfilled numeric; new_status text;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into order_row from public.sales_orders so where so.id=target_sales_order_id and so.company_id=target_company_id for update;
  if not found then raise exception 'Sales order was not found' using errcode='P0002'; end if;
  if order_row.archived_at is not null or order_row.status not in ('confirmed','in_preparation','partially_fulfilled') then raise exception 'Sales order cannot receive fulfillment in its current state' using errcode='23514'; end if;
  if jsonb_typeof(fulfilled_items)<>'array' or jsonb_array_length(fulfilled_items)=0 then raise exception 'At least one fulfillment item is required' using errcode='22023'; end if;
  select coalesce(max(f.fulfillment_number),0)+1 into next_fulfillment_number from public.sales_order_fulfillments f where f.sales_order_id=order_row.id;
  insert into public.sales_order_fulfillments(company_id,sales_order_id,fulfillment_number,fulfilled_at,delivery_reference,note,created_by)
  values(target_company_id,order_row.id,next_fulfillment_number,coalesce(requested_fulfilled_at,now()),nullif(btrim(requested_delivery_reference),''),nullif(btrim(requested_note),''),actor_id) returning id into created_fulfillment_id;
  for item_payload in select value from jsonb_array_elements(fulfilled_items) loop
    requested_quantity:=(item_payload->>'fulfilled_quantity')::numeric;
    if requested_quantity is null or requested_quantity<=0 then raise exception 'Fulfilled quantity must be greater than zero' using errcode='23514'; end if;
    select * into order_item from public.sales_order_items oi where oi.id=(item_payload->>'sales_order_item_id')::uuid and oi.sales_order_id=order_row.id and oi.company_id=target_company_id for update;
    if not found then raise exception 'Fulfillment item does not belong to sales order' using errcode='23514'; end if;
    select coalesce(sum(fi.fulfilled_quantity),0) into already_fulfilled from public.sales_order_fulfillment_items fi where fi.sales_order_item_id=order_item.id;
    if already_fulfilled+requested_quantity>order_item.ordered_quantity then raise exception 'Fulfilled quantity exceeds ordered quantity' using errcode='23514'; end if;
    insert into public.sales_order_fulfillment_items(company_id,fulfillment_id,sales_order_item_id,fulfilled_quantity) values(target_company_id,created_fulfillment_id,order_item.id,requested_quantity);
  end loop;
  new_status:=case when public.sales_order_is_fully_fulfilled(order_row.id) then 'completed' else 'partially_fulfilled' end;
  perform set_config('octo.sales_order_status_transition','on',true);
  update public.sales_orders set status=new_status,preparation_started_at=coalesce(preparation_started_at,now()),completed_at=case when new_status='completed' then now() else null end where id=order_row.id;
  perform set_config('octo.sales_order_status_transition','',true);
  if order_row.status<>new_status then insert into public.sales_order_status_history(company_id,sales_order_id,from_status,to_status,changed_by,reason) values(target_company_id,order_row.id,order_row.status,new_status,actor_id,'Fulfillment recorded'); end if;
  return query select created_fulfillment_id,next_fulfillment_number,new_status;
end $$;

create or replace function public.archive_sales_order(target_company_id uuid,target_sales_order_id uuid)
returns public.sales_orders language plpgsql security definer set search_path = '' as $$
declare archived_order public.sales_orders%rowtype;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if exists(select 1 from public.sales_order_fulfillments f where f.sales_order_id=target_sales_order_id and f.company_id=target_company_id) then raise exception 'Fulfilled sales order cannot be archived' using errcode='23514'; end if;
  perform set_config('octo.sales_order_archive','on',true);
  update public.sales_orders set archived_at=now() where id=target_sales_order_id and company_id=target_company_id and status='draft' and archived_at is null returning * into archived_order;
  perform set_config('octo.sales_order_archive','',true);
  if archived_order.id is null then raise exception 'Only an active draft sales order can be archived' using errcode='23514'; end if;
  return archived_order;
end $$;

revoke all on function public.normalize_sales_order() from public,anon,authenticated;
revoke all on function public.protect_sales_order_item() from public,anon,authenticated;
revoke all on function public.protect_sales_order_fulfillment() from public,anon,authenticated;
revoke all on function public.protect_sales_order_history() from public,anon,authenticated;
revoke all on function public.validate_sales_order_fulfillment_item() from public,anon,authenticated;
revoke all on function public.next_sales_order_number(uuid,date) from public,anon,authenticated;
revoke all on function public.sales_order_is_fully_fulfilled(uuid) from public,anon,authenticated;
revoke all on function public.convert_accepted_quote_to_sales_order(uuid,uuid,date,date,text) from public,anon;
revoke all on function public.transition_sales_order_status(uuid,uuid,text,text) from public,anon;
revoke all on function public.record_sales_order_fulfillment(uuid,uuid,timestamptz,text,text,jsonb) from public,anon;
revoke all on function public.archive_sales_order(uuid,uuid) from public,anon;
grant execute on function public.convert_accepted_quote_to_sales_order(uuid,uuid,date,date,text) to authenticated;
grant execute on function public.transition_sales_order_status(uuid,uuid,text,text) to authenticated;
grant execute on function public.record_sales_order_fulfillment(uuid,uuid,timestamptz,text,text,jsonb) to authenticated;
grant execute on function public.archive_sales_order(uuid,uuid) to authenticated;

alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.sales_order_fulfillments enable row level security;
alter table public.sales_order_fulfillment_items enable row level security;
alter table public.sales_order_status_history enable row level security;
alter table public.sales_order_number_counters enable row level security;

revoke all on table public.sales_orders,public.sales_order_items,public.sales_order_fulfillments,public.sales_order_fulfillment_items,public.sales_order_status_history,public.sales_order_number_counters from public,anon,authenticated;
grant select on table public.sales_orders,public.sales_order_items,public.sales_order_fulfillments,public.sales_order_fulfillment_items,public.sales_order_status_history to authenticated;

create policy sales_orders_read on public.sales_orders for select to authenticated using(public.is_company_member(company_id));
create policy sales_order_items_read on public.sales_order_items for select to authenticated using(public.is_company_member(company_id));
create policy sales_order_fulfillments_read on public.sales_order_fulfillments for select to authenticated using(public.is_company_member(company_id));
create policy sales_order_fulfillment_items_read on public.sales_order_fulfillment_items for select to authenticated using(public.is_company_member(company_id));
create policy sales_order_history_read on public.sales_order_status_history for select to authenticated using(public.is_company_member(company_id));

comment on table public.sales_orders is 'Immutable accepted-quotation commercial snapshots with controlled operational status.';
comment on table public.sales_order_fulfillments is 'Append-only fulfillment headers; V1 has no reversal workflow.';
