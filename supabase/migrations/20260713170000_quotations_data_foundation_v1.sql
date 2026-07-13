-- Octo Quotations Data Foundation V1

create table public.sales_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_number text not null check (char_length(btrim(quote_number)) > 0),
  party_id uuid not null,
  contact_id uuid,
  opportunity_id uuid,
  owner_user_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft','pending_approval','sent','viewed','revision_requested','accepted','rejected','expired','cancelled')),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','GBP')),
  issue_date date not null default current_date,
  valid_until date,
  payment_terms text,
  delivery_terms text,
  expected_delivery_date date,
  customer_notes text,
  internal_notes text,
  current_version_id uuid,
  approval_required boolean not null default false,
  approval_reason text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  acceptance_evidence text,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_number),
  unique (id, company_id),
  constraint sales_quotes_party_company_fk foreign key (party_id, company_id) references public.business_parties(id, company_id),
  constraint sales_quotes_contact_company_fk foreign key (contact_id, company_id) references public.business_contacts(id, company_id),
  constraint sales_quotes_opportunity_company_fk foreign key (opportunity_id, company_id) references public.sales_opportunities(id, company_id),
  check (valid_until is null or valid_until >= issue_date),
  check ((status = 'accepted') = (accepted_at is not null)),
  check ((status = 'rejected') = (rejected_at is not null)),
  check ((status = 'expired') = (expired_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((approved_by is null) = (approved_at is null))
);

create index sales_quotes_company_idx on public.sales_quotes(company_id);
create index sales_quotes_party_idx on public.sales_quotes(company_id, party_id);
create index sales_quotes_opportunity_idx on public.sales_quotes(company_id, opportunity_id);
create index sales_quotes_status_idx on public.sales_quotes(company_id, status);
create index sales_quotes_owner_idx on public.sales_quotes(company_id, owner_user_id);
create index sales_quotes_valid_until_idx on public.sales_quotes(valid_until);
create index sales_quotes_archived_idx on public.sales_quotes(archived_at);

create table public.sales_quote_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null,
  version_number integer not null check (version_number > 0),
  revision_note text,
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(18,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(18,2) not null default 0 check (tax_total >= 0),
  other_tax_total numeric(18,2) not null default 0 check (other_tax_total >= 0),
  grand_total numeric(18,2) not null default 0 check (grand_total >= 0),
  total_cost numeric(18,2) check (total_cost is null or total_cost >= 0),
  gross_margin numeric(18,2),
  gross_margin_pct numeric(9,4),
  is_current boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (quote_id, version_number),
  unique (id, company_id),
  constraint sales_quote_versions_quote_company_fk foreign key (quote_id, company_id) references public.sales_quotes(id, company_id) on delete cascade
);

create unique index sales_quote_versions_one_current on public.sales_quote_versions(quote_id) where is_current;
create index sales_quote_versions_company_idx on public.sales_quote_versions(company_id);
create index sales_quote_versions_quote_idx on public.sales_quote_versions(quote_id, version_number desc);

create table public.sales_quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_version_id uuid not null,
  position integer not null check (position > 0),
  item_code text,
  description text not null check (char_length(btrim(description)) > 0),
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null check (char_length(btrim(unit)) > 0),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  discount_type text check (discount_type is null or discount_type in ('percentage','fixed')),
  discount_value numeric(18,4) not null default 0 check (discount_value >= 0),
  vat_rate numeric(7,4) not null default 20 check (vat_rate >= 0),
  other_tax_rate numeric(7,4) not null default 0 check (other_tax_rate >= 0),
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  line_subtotal numeric(18,2) not null check (line_subtotal >= 0),
  line_discount numeric(18,2) not null check (line_discount >= 0),
  line_tax numeric(18,2) not null check (line_tax >= 0),
  line_other_tax numeric(18,2) not null check (line_other_tax >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  line_cost numeric(18,2) check (line_cost is null or line_cost >= 0),
  line_margin numeric(18,2),
  line_margin_pct numeric(9,4),
  created_at timestamptz not null default now(),
  unique (quote_version_id, position),
  constraint sales_quote_items_version_company_fk foreign key (quote_version_id, company_id) references public.sales_quote_versions(id, company_id) on delete cascade,
  check (discount_type = 'percentage' or discount_type = 'fixed' or discount_value = 0),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create index sales_quote_items_company_idx on public.sales_quote_items(company_id);
create index sales_quote_items_version_idx on public.sales_quote_items(quote_version_id, position);

create table public.sales_quote_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null,
  from_status text check (from_status is null or from_status in ('draft','pending_approval','sent','viewed','revision_requested','accepted','rejected','expired','cancelled')),
  to_status text not null check (to_status in ('draft','pending_approval','sent','viewed','revision_requested','accepted','rejected','expired','cancelled')),
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text,
  evidence text,
  constraint sales_quote_history_quote_company_fk foreign key (quote_id, company_id) references public.sales_quotes(id, company_id) on delete cascade
);

create index sales_quote_history_company_idx on public.sales_quote_status_history(company_id);
create index sales_quote_history_quote_idx on public.sales_quote_status_history(quote_id, changed_at desc);

create table public.sales_quote_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 2000 and 9999),
  next_number bigint not null default 1 check (next_number > 0),
  primary key (company_id, calendar_year)
);

alter table public.sales_quotes add constraint sales_quotes_current_version_company_fk
  foreign key (current_version_id, company_id) references public.sales_quote_versions(id, company_id);

create or replace function public.normalize_sales_quote()
returns trigger language plpgsql set search_path = '' as $$
declare actor_id uuid := auth.uid(); contact_party uuid; opportunity_party uuid;
begin
  if actor_id is null then raise exception 'Authenticated user is required' using errcode='42501'; end if;
  if tg_op = 'UPDATE' then
    if new.company_id <> old.company_id then raise exception 'Quote company cannot change' using errcode='23514'; end if;
    if old.status = 'accepted' then raise exception 'Accepted quotes cannot be edited' using errcode='23514'; end if;
    if new.quote_number <> old.quote_number then raise exception 'Quote number cannot change' using errcode='23514'; end if;
    if new.status <> old.status and current_setting('octo.quote_status_transition', true) <> 'on' then raise exception 'Quote status requires controlled transition' using errcode='42501'; end if;
  end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=new.company_id and m.user_id=new.owner_user_id and m.status='active') then raise exception 'Quote owner must be an active company member' using errcode='23514'; end if;
  if new.contact_id is not null then select c.party_id into contact_party from public.business_contacts c where c.id=new.contact_id and c.company_id=new.company_id and c.archived_at is null; if contact_party is distinct from new.party_id then raise exception 'Quote contact must belong to selected party' using errcode='23514'; end if; end if;
  if new.opportunity_id is not null then select o.party_id into opportunity_party from public.sales_opportunities o where o.id=new.opportunity_id and o.company_id=new.company_id and o.archived_at is null; if opportunity_party is distinct from new.party_id then raise exception 'Quote opportunity must belong to selected party' using errcode='23514'; end if; end if;
  new.payment_terms := nullif(btrim(new.payment_terms),''); new.delivery_terms := nullif(btrim(new.delivery_terms),'');
  new.customer_notes := nullif(btrim(new.customer_notes),''); new.internal_notes := nullif(btrim(new.internal_notes),'');
  new.approval_reason := nullif(btrim(new.approval_reason),''); new.acceptance_evidence := nullif(btrim(new.acceptance_evidence),'');
  if tg_op = 'INSERT' then new.created_by := actor_id; end if;
  new.updated_by := actor_id;
  return new;
end $$;

create or replace function public.protect_sales_quote_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_setting('octo.quote_version_build', true) = 'on' then return new; end if;
  if tg_op = 'UPDATE' and current_setting('octo.quote_revision', true) = 'on'
    and old.is_current and not new.is_current
    and row(new.id,new.company_id,new.quote_id,new.version_number,new.revision_note,new.subtotal,new.discount_total,new.tax_total,new.other_tax_total,new.grand_total,new.total_cost,new.gross_margin,new.gross_margin_pct,new.created_by,new.created_at)
      is not distinct from row(old.id,old.company_id,old.quote_id,old.version_number,old.revision_note,old.subtotal,old.discount_total,old.tax_total,old.other_tax_total,old.grand_total,old.total_cost,old.gross_margin,old.gross_margin_pct,old.created_by,old.created_at)
  then return new; end if;
  raise exception 'Quote versions are immutable' using errcode='42501';
end $$;

create or replace function public.protect_sales_quote_item()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Quote items are immutable' using errcode='42501'; end $$;

create trigger sales_quotes_normalize before insert or update on public.sales_quotes for each row execute function public.normalize_sales_quote();
create trigger sales_quotes_updated_at before update on public.sales_quotes for each row execute function public.set_updated_at();
create trigger sales_quote_versions_immutable before update or delete on public.sales_quote_versions for each row execute function public.protect_sales_quote_version();
create trigger sales_quote_items_immutable before update or delete on public.sales_quote_items for each row execute function public.protect_sales_quote_item();

create or replace function public.next_sales_quote_number(target_company_id uuid, target_issue_date date)
returns text language plpgsql security definer set search_path = '' as $$
declare target_year integer := extract(year from target_issue_date); allocated_number bigint;
begin
  insert into public.sales_quote_number_counters(company_id,calendar_year,next_number)
  values(target_company_id,target_year,2)
  on conflict(company_id,calendar_year) do update set next_number=public.sales_quote_number_counters.next_number+1
  returning next_number-1 into allocated_number;
  return 'TKL-'||target_year::text||'-'||lpad(allocated_number::text,6,'0');
end $$;

create or replace function public.insert_sales_quote_version(
  target_company_id uuid, target_quote_id uuid, target_version_number integer,
  target_revision_note text, target_items jsonb, actor_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare version_id uuid; item_record jsonb; item_position integer; item_description text; item_unit text; item_discount_type text;
  item_quantity numeric; item_unit_price numeric; item_discount_value numeric; item_vat_rate numeric; item_other_tax_rate numeric; item_unit_cost numeric;
  calculated_subtotal numeric; calculated_discount numeric; taxable_amount numeric; calculated_vat numeric; calculated_other_tax numeric; calculated_total numeric;
  calculated_cost numeric; calculated_margin numeric; calculated_margin_pct numeric;
  sum_subtotal numeric:=0; sum_discount numeric:=0; sum_tax numeric:=0; sum_other_tax numeric:=0; sum_total numeric:=0; sum_cost numeric:=0; all_costs_present boolean:=true; item_count integer:=0;
begin
  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items)=0 then raise exception 'At least one quote item is required' using errcode='22023'; end if;
  insert into public.sales_quote_versions(company_id,quote_id,version_number,revision_note,created_by)
  values(target_company_id,target_quote_id,target_version_number,nullif(btrim(target_revision_note),''),actor_id) returning id into version_id;
  for item_record in select value from jsonb_array_elements(target_items) loop
    item_count:=item_count+1;
    item_position:=coalesce((item_record->>'position')::integer,item_count); item_description:=nullif(btrim(item_record->>'description'),''); item_unit:=nullif(btrim(item_record->>'unit'),'');
    item_quantity:=(item_record->>'quantity')::numeric; item_unit_price:=(item_record->>'unit_price')::numeric;
    item_discount_type:=nullif(btrim(item_record->>'discount_type'),''); item_discount_value:=coalesce((item_record->>'discount_value')::numeric,0);
    item_vat_rate:=coalesce((item_record->>'vat_rate')::numeric,20); item_other_tax_rate:=coalesce((item_record->>'other_tax_rate')::numeric,0); item_unit_cost:=(item_record->>'unit_cost')::numeric;
    if item_description is null or item_unit is null or item_position<=0 or item_quantity<=0 or item_unit_price<0 or item_discount_value<0 or item_vat_rate<0 or item_other_tax_rate<0 or (item_discount_type is not null and item_discount_type not in ('percentage','fixed')) or (item_discount_type='percentage' and item_discount_value>100) or (item_unit_cost is not null and item_unit_cost<0) then raise exception 'Invalid quote item' using errcode='23514'; end if;
    calculated_subtotal:=round(item_quantity*item_unit_price,2);
    calculated_discount:=round(case item_discount_type when 'percentage' then calculated_subtotal*item_discount_value/100 when 'fixed' then item_discount_value else 0 end,2);
    if calculated_discount>calculated_subtotal then raise exception 'Quote item discount exceeds subtotal' using errcode='23514'; end if;
    taxable_amount:=calculated_subtotal-calculated_discount; calculated_vat:=round(taxable_amount*item_vat_rate/100,2); calculated_other_tax:=round(taxable_amount*item_other_tax_rate/100,2); calculated_total:=taxable_amount+calculated_vat+calculated_other_tax;
    if item_unit_cost is null then all_costs_present:=false; calculated_cost:=null; calculated_margin:=null; calculated_margin_pct:=null;
    else calculated_cost:=round(item_quantity*item_unit_cost,2); calculated_margin:=taxable_amount-calculated_cost; calculated_margin_pct:=case when taxable_amount=0 then null else round(calculated_margin/taxable_amount*100,4) end; sum_cost:=sum_cost+calculated_cost; end if;
    insert into public.sales_quote_items(company_id,quote_version_id,position,item_code,description,quantity,unit,unit_price,discount_type,discount_value,vat_rate,other_tax_rate,unit_cost,line_subtotal,line_discount,line_tax,line_other_tax,line_total,line_cost,line_margin,line_margin_pct)
    values(target_company_id,version_id,item_position,nullif(btrim(item_record->>'item_code'),''),item_description,item_quantity,item_unit,item_unit_price,item_discount_type,item_discount_value,item_vat_rate,item_other_tax_rate,item_unit_cost,calculated_subtotal,calculated_discount,calculated_vat,calculated_other_tax,calculated_total,calculated_cost,calculated_margin,calculated_margin_pct);
    sum_subtotal:=sum_subtotal+calculated_subtotal; sum_discount:=sum_discount+calculated_discount; sum_tax:=sum_tax+calculated_vat; sum_other_tax:=sum_other_tax+calculated_other_tax; sum_total:=sum_total+calculated_total;
  end loop;
  perform set_config('octo.quote_version_build','on',true);
  update public.sales_quote_versions set subtotal=round(sum_subtotal,2),discount_total=round(sum_discount,2),tax_total=round(sum_tax,2),other_tax_total=round(sum_other_tax,2),grand_total=round(sum_total,2),total_cost=case when all_costs_present then round(sum_cost,2) end,gross_margin=case when all_costs_present then round(sum_subtotal-sum_discount-sum_cost,2) end,gross_margin_pct=case when all_costs_present and sum_subtotal-sum_discount<>0 then round((sum_subtotal-sum_discount-sum_cost)/(sum_subtotal-sum_discount)*100,4) end where id=version_id;
  perform set_config('octo.quote_version_build','',true);
  return version_id;
end $$;

create or replace function public.create_sales_quote(
  target_company_id uuid, target_party_id uuid, target_contact_id uuid default null, target_opportunity_id uuid default null,
  target_owner_user_id uuid default null, quote_currency text default 'TRY', quote_issue_date date default current_date, quote_valid_until date default null,
  quote_payment_terms text default null, quote_delivery_terms text default null, quote_expected_delivery_date date default null,
  quote_customer_notes text default null, quote_internal_notes text default null, quote_approval_required boolean default false,
  quote_approval_reason text default null, quote_items jsonb default '[]'::jsonb
) returns table(quote_id uuid,quote_number text,version_id uuid)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); created_quote_id uuid; created_number text; created_version_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  created_number:=public.next_sales_quote_number(target_company_id,quote_issue_date);
  insert into public.sales_quotes(company_id,quote_number,party_id,contact_id,opportunity_id,owner_user_id,currency,issue_date,valid_until,payment_terms,delivery_terms,expected_delivery_date,customer_notes,internal_notes,approval_required,approval_reason,created_by,updated_by)
  values(target_company_id,created_number,target_party_id,target_contact_id,target_opportunity_id,coalesce(target_owner_user_id,actor_id),quote_currency,quote_issue_date,quote_valid_until,quote_payment_terms,quote_delivery_terms,quote_expected_delivery_date,quote_customer_notes,quote_internal_notes,quote_approval_required,quote_approval_reason,actor_id,actor_id) returning id into created_quote_id;
  created_version_id:=public.insert_sales_quote_version(target_company_id,created_quote_id,1,null,quote_items,actor_id);
  update public.sales_quotes set current_version_id=created_version_id where id=created_quote_id;
  insert into public.sales_quote_status_history(company_id,quote_id,from_status,to_status,changed_by,reason) values(target_company_id,created_quote_id,null,'draft',actor_id,'Teklif oluşturuldu');
  return query select created_quote_id,created_number,created_version_id;
end $$;

create or replace function public.create_sales_quote_revision(
  target_company_id uuid, target_quote_id uuid, revision_note text, replacement_items jsonb,
  new_valid_until date default null, new_payment_terms text default null, new_delivery_terms text default null,
  new_expected_delivery_date date default null, new_customer_notes text default null, new_internal_notes text default null
) returns table(version_id uuid,version_number integer)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); quote_row public.sales_quotes%rowtype; next_version integer; created_version uuid; old_status text;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into quote_row from public.sales_quotes q where q.id=target_quote_id and q.company_id=target_company_id for update;
  if not found then raise exception 'Quote not found' using errcode='P0002'; end if;
  if quote_row.archived_at is not null or quote_row.status in ('accepted','rejected','expired','cancelled') then raise exception 'Quote cannot be revised' using errcode='23514'; end if;
  select coalesce(max(v.version_number),0)+1 into next_version from public.sales_quote_versions v where v.quote_id=target_quote_id;
  perform set_config('octo.quote_revision','on',true); update public.sales_quote_versions set is_current=false where quote_id=target_quote_id and is_current; perform set_config('octo.quote_revision','',true);
  created_version:=public.insert_sales_quote_version(target_company_id,target_quote_id,next_version,revision_note,replacement_items,actor_id);
  old_status:=quote_row.status;
  if old_status='revision_requested' then perform set_config('octo.quote_status_transition','on',true); end if;
  update public.sales_quotes set current_version_id=created_version,valid_until=coalesce(new_valid_until,valid_until),payment_terms=coalesce(new_payment_terms,payment_terms),delivery_terms=coalesce(new_delivery_terms,delivery_terms),expected_delivery_date=coalesce(new_expected_delivery_date,expected_delivery_date),customer_notes=coalesce(new_customer_notes,customer_notes),internal_notes=coalesce(new_internal_notes,internal_notes),status=case when old_status='revision_requested' then 'draft' else status end where id=target_quote_id;
  perform set_config('octo.quote_status_transition','',true);
  if old_status='revision_requested' then insert into public.sales_quote_status_history(company_id,quote_id,from_status,to_status,changed_by,reason) values(target_company_id,target_quote_id,old_status,'draft',actor_id,coalesce(nullif(btrim(revision_note),''),'Yeni revizyon oluşturuldu')); end if;
  return query select created_version,next_version;
end $$;

create or replace function public.transition_sales_quote_status(target_company_id uuid,target_quote_id uuid,destination_status text,transition_reason text default null,transition_evidence text default null)
returns public.sales_quotes language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); quote_row public.sales_quotes%rowtype; updated_quote public.sales_quotes%rowtype; allowed boolean:=false; normalized_reason text:=nullif(btrim(transition_reason),''); normalized_evidence text:=nullif(btrim(transition_evidence),'');
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into quote_row from public.sales_quotes q where q.id=target_quote_id and q.company_id=target_company_id for update;
  if not found or quote_row.archived_at is not null then raise exception 'Quote not found' using errcode='P0002'; end if;
  allowed:=case quote_row.status
    when 'draft' then destination_status in ('pending_approval','sent','cancelled')
    when 'pending_approval' then destination_status in ('draft','sent','cancelled')
    when 'sent' then destination_status in ('viewed','revision_requested','accepted','rejected','expired','cancelled')
    when 'viewed' then destination_status in ('revision_requested','accepted','rejected','expired','cancelled')
    when 'revision_requested' then destination_status in ('draft','cancelled') else false end;
  if not allowed then raise exception 'Invalid quote status transition' using errcode='23514'; end if;
  if destination_status='accepted' and normalized_evidence is null and normalized_reason is null then raise exception 'Acceptance evidence or reason is required' using errcode='23514'; end if;
  if destination_status in ('rejected','cancelled') and normalized_reason is null then raise exception 'Transition reason is required' using errcode='23514'; end if;
  if quote_row.status='draft' and destination_status='sent' and quote_row.approval_required and quote_row.approved_at is null then raise exception 'Owner approval is required' using errcode='42501'; end if;
  if quote_row.status='pending_approval' and destination_status='sent' and not public.is_company_owner(target_company_id) then raise exception 'Only an owner may approve a quote' using errcode='42501'; end if;
  perform set_config('octo.quote_status_transition','on',true);
  update public.sales_quotes set status=destination_status,
    approval_required=case when destination_status='pending_approval' then true else approval_required end,
    approval_reason=case when destination_status='pending_approval' then coalesce(normalized_reason,approval_reason) else approval_reason end,
    approved_by=case when quote_row.status='pending_approval' and destination_status='sent' then actor_id else approved_by end,
    approved_at=case when quote_row.status='pending_approval' and destination_status='sent' then now() else approved_at end,
    accepted_at=case when destination_status='accepted' then now() end,rejected_at=case when destination_status='rejected' then now() end,
    expired_at=case when destination_status='expired' then now() end,cancelled_at=case when destination_status='cancelled' then now() end,
    acceptance_evidence=case when destination_status='accepted' then coalesce(normalized_evidence,normalized_reason) else acceptance_evidence end
  where id=target_quote_id returning * into updated_quote;
  perform set_config('octo.quote_status_transition','',true);
  insert into public.sales_quote_status_history(company_id,quote_id,from_status,to_status,changed_by,reason,evidence) values(target_company_id,target_quote_id,quote_row.status,destination_status,actor_id,normalized_reason,normalized_evidence);
  return updated_quote;
end $$;

create or replace function public.archive_sales_quote(target_company_id uuid,target_quote_id uuid)
returns public.sales_quotes language plpgsql security definer set search_path = '' as $$
declare archived_quote public.sales_quotes%rowtype;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  update public.sales_quotes set archived_at=now() where id=target_quote_id and company_id=target_company_id and status='draft' and archived_at is null returning * into archived_quote;
  if not found then raise exception 'Only active draft quotes may be archived' using errcode='23514'; end if;
  return archived_quote;
end $$;

revoke all on function public.next_sales_quote_number(uuid,date) from public,anon,authenticated;
revoke all on function public.insert_sales_quote_version(uuid,uuid,integer,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.create_sales_quote(uuid,uuid,uuid,uuid,uuid,text,date,date,text,text,date,text,text,boolean,text,jsonb) from public,anon;
revoke all on function public.create_sales_quote_revision(uuid,uuid,text,jsonb,date,text,text,date,text,text) from public,anon;
revoke all on function public.transition_sales_quote_status(uuid,uuid,text,text,text) from public,anon;
revoke all on function public.archive_sales_quote(uuid,uuid) from public,anon;
grant execute on function public.create_sales_quote(uuid,uuid,uuid,uuid,uuid,text,date,date,text,text,date,text,text,boolean,text,jsonb) to authenticated;
grant execute on function public.create_sales_quote_revision(uuid,uuid,text,jsonb,date,text,text,date,text,text) to authenticated;
grant execute on function public.transition_sales_quote_status(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.archive_sales_quote(uuid,uuid) to authenticated;

alter table public.sales_quotes enable row level security;
alter table public.sales_quote_versions enable row level security;
alter table public.sales_quote_items enable row level security;
alter table public.sales_quote_status_history enable row level security;
alter table public.sales_quote_number_counters enable row level security;

revoke all on table public.sales_quotes,public.sales_quote_versions,public.sales_quote_items,public.sales_quote_status_history,public.sales_quote_number_counters from public,anon,authenticated;
grant select on table public.sales_quotes,public.sales_quote_versions,public.sales_quote_items,public.sales_quote_status_history to authenticated;

create policy sales_quotes_read on public.sales_quotes for select to authenticated using(public.is_company_member(company_id));
create policy sales_quote_versions_read on public.sales_quote_versions for select to authenticated using(public.is_company_member(company_id));
create policy sales_quote_items_read on public.sales_quote_items for select to authenticated using(public.is_company_member(company_id));
create policy sales_quote_history_read on public.sales_quote_status_history for select to authenticated using(public.is_company_member(company_id));
