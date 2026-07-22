-- Octo Assisted Execution Data Foundation V1

create table public.execution_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_type text not null check (case_type in ('quote_preparation')),
  status text not null check (status in ('detected','prepared','awaiting_review','approved','executing','executed','completed','rejected','expired','cancelled','failed')),
  target_party_id uuid not null,
  target_contact_id uuid,
  target_opportunity_id uuid,
  target_quote_id uuid,
  executed_quote_id uuid,
  responsible_user_id uuid not null references auth.users(id),
  trigger_type text not null check (trigger_type in ('workbench','opportunity','quotation','manual')),
  triggered_at timestamptz not null default now(),
  prepared_at timestamptz,
  review_due_at timestamptz,
  approved_at timestamptz,
  executed_at timestamptz,
  completed_at timestamptz,
  ruleset_key text not null,
  ruleset_version text not null,
  evidence_quality text not null check (evidence_quality in ('high','medium','low','insufficient')),
  summary text not null,
  primary_recommendation text not null,
  source_fingerprint text not null,
  replaces_case_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, company_id),
  unique (executed_quote_id),
  constraint execution_cases_party_company_fk foreign key (target_party_id, company_id) references public.business_parties(id, company_id),
  constraint execution_cases_contact_company_fk foreign key (target_contact_id, company_id) references public.business_contacts(id, company_id),
  constraint execution_cases_opportunity_company_fk foreign key (target_opportunity_id, company_id) references public.sales_opportunities(id, company_id),
  constraint execution_cases_target_quote_company_fk foreign key (target_quote_id, company_id) references public.sales_quotes(id, company_id),
  constraint execution_cases_executed_quote_company_fk foreign key (executed_quote_id, company_id) references public.sales_quotes(id, company_id),
  constraint execution_cases_replaces_company_fk foreign key (replaces_case_id, company_id) references public.execution_cases(id, company_id),
  check (ruleset_key = 'quote-preparation-v1'),
  check ((status in ('executed','completed')) = (executed_quote_id is not null)),
  check (executed_quote_id is null or executed_at is not null)
);

create index execution_cases_company_status_idx on public.execution_cases(company_id, status, updated_at desc);
create index execution_cases_party_idx on public.execution_cases(company_id, target_party_id, created_at desc);
create index execution_cases_opportunity_idx on public.execution_cases(company_id, target_opportunity_id, created_at desc);
create index execution_cases_responsible_idx on public.execution_cases(company_id, responsible_user_id, status);
create index execution_cases_review_due_idx on public.execution_cases(company_id, review_due_at) where status = 'awaiting_review';
create index execution_cases_source_fingerprint_idx on public.execution_cases(company_id, case_type, source_fingerprint);

create table public.execution_evidence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  evidence_type text not null,
  source_domain text not null check (source_domain in ('crm','sales','finance','customer_health')),
  source_type text not null,
  source_record_id uuid,
  observed_at timestamptz,
  label text not null,
  safe_summary text not null,
  currency text check (currency is null or currency in ('TRY','EUR','USD','GBP')),
  amount numeric(18,2),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (id, company_id),
  constraint execution_evidence_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id)
);
create index execution_evidence_case_idx on public.execution_evidence(company_id, case_id, created_at);

create table public.execution_assumptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  assumption_key text not null,
  label text not null,
  value jsonb not null,
  source text not null check (source in ('structured_record','company_policy','historical_pattern','user_input','default_policy')),
  confidence text not null check (confidence in ('high','medium','low')),
  requires_confirmation boolean not null default false,
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, company_id),
  unique (case_id, assumption_key),
  constraint execution_assumptions_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id),
  check ((confirmed_by is null) = (confirmed_at is null))
);
create index execution_assumptions_case_idx on public.execution_assumptions(company_id, case_id);

create table public.execution_missing_inputs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  input_key text not null,
  label text not null,
  severity text not null check (severity in ('info','warning','critical')),
  blocking boolean not null default false,
  resolution_type text not null check (resolution_type in ('text','number','date','boolean','structured')),
  resolved_value jsonb,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, company_id),
  unique (case_id, input_key),
  constraint execution_missing_inputs_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id),
  check ((resolved_by is null) = (resolved_at is null))
);
create index execution_missing_inputs_case_idx on public.execution_missing_inputs(company_id, case_id, blocking, resolved_at);

create table public.execution_artifacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  artifact_type text not null check (artifact_type in ('quote_draft','internal_review_summary','cover_email_draft')),
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  source_fingerprint text not null,
  prepared_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (id, company_id),
  unique (case_id, artifact_type, version_number),
  constraint execution_artifacts_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id)
);
create unique index execution_artifacts_current_idx on public.execution_artifacts(case_id, artifact_type) where superseded_at is null;
create index execution_artifacts_case_idx on public.execution_artifacts(company_id, case_id, artifact_type, version_number desc);

create table public.execution_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  decision text not null check (decision in ('approve','approve_with_edits','reject','cancel')),
  reason_code text,
  reason_text text,
  decision_snapshot jsonb not null default '{}'::jsonb,
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  unique (id, company_id),
  constraint execution_decisions_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id),
  check (decision <> 'reject' or char_length(btrim(reason_code)) > 0)
);
create index execution_decisions_case_idx on public.execution_decisions(company_id, case_id, decided_at);

create table public.execution_field_edits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  artifact_id uuid not null,
  field_path text not null,
  original_value jsonb,
  final_value jsonb,
  edit_category text not null check (edit_category in ('commercial_judgment','missing_context','customer_relationship','pricing','discount','payment_terms','delivery','wording','error_correction','other')),
  edited_by uuid not null references auth.users(id),
  edited_at timestamptz not null default now(),
  unique (id, company_id),
  constraint execution_field_edits_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id),
  constraint execution_field_edits_artifact_company_fk foreign key (artifact_id, company_id) references public.execution_artifacts(id, company_id)
);
create index execution_field_edits_case_idx on public.execution_field_edits(company_id, case_id, edited_at);

create table public.execution_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  event_type text not null,
  actor_type text not null check (actor_type in ('user','system')),
  actor_user_id uuid references auth.users(id),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (id, company_id),
  constraint execution_events_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id),
  check ((actor_type = 'user') = (actor_user_id is not null))
);
create index execution_events_case_idx on public.execution_events(company_id, case_id, occurred_at);

create table public.execution_outcomes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null,
  outcome_type text not null check (outcome_type in ('quotation_created','quotation_sent','quotation_viewed','quotation_revision_created','quotation_revision_requested','quotation_accepted','quotation_rejected','quotation_expired','sales_order_created')),
  source_domain text not null check (source_domain in ('quotations','sales_orders','finance')),
  source_record_id uuid not null,
  observed_at timestamptz not null,
  outcome_value numeric(18,2),
  currency text check (currency is null or currency in ('TRY','EUR','USD','GBP')),
  classification text,
  conclusive boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, company_id),
  unique (case_id, outcome_type, source_record_id),
  constraint execution_outcomes_case_company_fk foreign key (case_id, company_id) references public.execution_cases(id, company_id)
);
create index execution_outcomes_case_idx on public.execution_outcomes(company_id, case_id, observed_at);

create or replace function public.protect_execution_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Assisted Execution history is immutable' using errcode = '42501';
end $$;

create or replace function public.protect_execution_case()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_setting('octo.execution_case_write', true) = 'on' then return new; end if;
  raise exception 'Execution cases require a controlled operation' using errcode = '42501';
end $$;

create or replace function public.protect_execution_controlled_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_setting('octo.execution_controlled_write', true) = 'on' then return new; end if;
  raise exception 'Assisted Execution records require a controlled operation' using errcode = '42501';
end $$;

create trigger execution_cases_controlled before update or delete on public.execution_cases for each row execute function public.protect_execution_case();
create trigger execution_evidence_immutable before update or delete on public.execution_evidence for each row execute function public.protect_execution_immutable();
create trigger execution_assumptions_controlled before update or delete on public.execution_assumptions for each row execute function public.protect_execution_controlled_update();
create trigger execution_missing_inputs_controlled before update or delete on public.execution_missing_inputs for each row execute function public.protect_execution_controlled_update();
create trigger execution_artifacts_controlled before update or delete on public.execution_artifacts for each row execute function public.protect_execution_controlled_update();
create trigger execution_decisions_immutable before update or delete on public.execution_decisions for each row execute function public.protect_execution_immutable();
create trigger execution_field_edits_immutable before update or delete on public.execution_field_edits for each row execute function public.protect_execution_immutable();
create trigger execution_events_immutable before update or delete on public.execution_events for each row execute function public.protect_execution_immutable();
create trigger execution_outcomes_immutable before update or delete on public.execution_outcomes for each row execute function public.protect_execution_immutable();

create or replace function public.prepare_quote_execution_case(
  target_company_id uuid,
  target_party_id uuid,
  target_contact_id uuid default null,
  target_opportunity_id uuid default null,
  target_quote_id uuid default null,
  target_responsible_user_id uuid default null,
  requested_trigger_type text default 'manual',
  requested_currency text default null,
  requested_valid_until date default null,
  requested_payment_terms text default null,
  requested_delivery_terms text default null,
  requested_expected_delivery_date date default null,
  requested_customer_notes text default null,
  requested_internal_notes text default null,
  requested_lines jsonb default '[]'::jsonb,
  requested_review_due_at timestamptz default null
) returns table(case_id uuid, created_new boolean)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid(); owner_id uuid := coalesce(target_responsible_user_id, auth.uid());
  party_row public.business_parties%rowtype; opportunity_row public.sales_opportunities%rowtype;
  contact_row public.business_contacts%rowtype; source_quote_row public.sales_quotes%rowtype;
  line jsonb; prepared_lines jsonb := '[]'::jsonb; line_count integer := 0; missing_count integer := 0;
  position_value integer; description_value text; unit_value text; item_code_value text; quantity_value numeric; unit_price_value numeric;
  price_source jsonb; comparable record; currency_value text; source_hash text; created_case_id uuid; existing_case_id uuid;
  comparable_count integer; accepted_count integer; quality text; email_subject text; email_body text;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode = '42501'; end if;
  if requested_trigger_type not in ('workbench','opportunity','quotation','manual') then raise exception 'Invalid execution trigger' using errcode = '23514'; end if;
  select * into party_row from public.business_parties p where p.id = target_party_id and p.company_id = target_company_id and p.archived_at is null;
  if not found then raise exception 'Active party not found' using errcode = 'P0002'; end if;
  if not exists(select 1 from public.company_memberships m where m.company_id = target_company_id and m.user_id = owner_id and m.status = 'active') then raise exception 'Responsible user must be an active company member' using errcode = '23514'; end if;
  if target_contact_id is not null then
    select * into contact_row from public.business_contacts c where c.id = target_contact_id and c.company_id = target_company_id and c.party_id = target_party_id and c.archived_at is null;
    if not found then raise exception 'Contact does not belong to party' using errcode = '23514'; end if;
  end if;
  if target_opportunity_id is not null then
    select * into opportunity_row from public.sales_opportunities o where o.id = target_opportunity_id and o.company_id = target_company_id and o.party_id = target_party_id and o.archived_at is null;
    if not found then raise exception 'Opportunity does not belong to party' using errcode = '23514'; end if;
  end if;
  if target_quote_id is not null then
    select * into source_quote_row from public.sales_quotes q where q.id = target_quote_id and q.company_id = target_company_id and q.party_id = target_party_id and q.archived_at is null;
    if not found then raise exception 'Quotation context does not belong to party' using errcode = '23514'; end if;
  end if;
  currency_value := coalesce(nullif(btrim(requested_currency), ''), opportunity_row.currency, source_quote_row.currency);
  if currency_value is null or currency_value not in ('TRY','EUR','USD','GBP') then raise exception 'Quotation currency is required' using errcode = '23514'; end if;
  if jsonb_typeof(requested_lines) <> 'array' or jsonb_array_length(requested_lines) = 0 then raise exception 'At least one requested quotation line is required' using errcode = '22023'; end if;

  for line in select value from jsonb_array_elements(requested_lines) loop
    line_count := line_count + 1;
    position_value := coalesce((line->>'position')::integer, line_count);
    description_value := nullif(btrim(line->>'description'), ''); unit_value := nullif(btrim(line->>'unit'), ''); item_code_value := nullif(btrim(line->>'item_code'), '');
    quantity_value := nullif(line->>'quantity', '')::numeric; unit_price_value := nullif(line->>'unit_price', '')::numeric;
    if position_value <= 0 or description_value is null or unit_value is null or quantity_value is null or quantity_value <= 0 then raise exception 'Description, quantity and unit are required for every line' using errcode = '23514'; end if;
    price_source := null;
    if unit_price_value is not null and unit_price_value > 0 then
      price_source := jsonb_build_object('type','user_input','label','Kullanıcı tarafından açıkça girildi');
    else
      unit_price_value := null;
      select q.id quote_id, q.quote_number, q.issue_date, q.status, qi.quantity, qi.unit_price, qi.discount_type, qi.discount_value
        into comparable
        from public.sales_quotes q
        join public.sales_quote_versions qv on qv.id = q.current_version_id and qv.company_id = q.company_id
        join public.sales_quote_items qi on qi.quote_version_id = qv.id and qi.company_id = q.company_id
       where q.company_id = target_company_id and q.party_id = target_party_id and q.currency = currency_value and q.archived_at is null
         and q.id is distinct from target_quote_id
         and ((item_code_value is not null and qi.item_code = item_code_value) or (item_code_value is null and lower(qi.description) = lower(description_value)))
       order by (q.status = 'accepted') desc, (qi.quantity between quantity_value * 0.75 and quantity_value * 1.25) desc, q.issue_date desc, q.id
       limit 1;
      if found then
        unit_price_value := comparable.unit_price;
        price_source := jsonb_build_object('type',case when comparable.status = 'accepted' then 'accepted_comparable' else 'relevant_history' end,'quote_id',comparable.quote_id,'quote_number',comparable.quote_number,'date',comparable.issue_date,'currency',currency_value,'quantity',comparable.quantity,'outcome',comparable.status);
      end if;
    end if;
    prepared_lines := prepared_lines || jsonb_build_array(jsonb_build_object(
      'position',position_value,'item_code',item_code_value,'description',description_value,'quantity',quantity_value,'unit',unit_value,
      'unit_price',unit_price_value,'price_source',price_source,'discount_type',nullif(line->>'discount_type',''),'discount_value',coalesce(nullif(line->>'discount_value','')::numeric,0),
      'vat_rate',coalesce(nullif(line->>'vat_rate','')::numeric,20),'other_tax_rate',coalesce(nullif(line->>'other_tax_rate','')::numeric,0),'unit_cost',null
    ));
    if unit_price_value is null then missing_count := missing_count + 1; end if;
  end loop;

  select count(*), count(*) filter (where q.status = 'accepted') into comparable_count, accepted_count
    from public.sales_quotes q join public.sales_quote_versions qv on qv.id = q.current_version_id
   where q.company_id = target_company_id and q.party_id = target_party_id and q.currency = currency_value and q.archived_at is null and q.id is distinct from target_quote_id;
  source_hash := md5(concat_ws('|', target_company_id, target_party_id, coalesce(target_contact_id::text,''), coalesce(target_opportunity_id::text,''), coalesce(target_quote_id::text,''), owner_id, requested_trigger_type, currency_value,
    coalesce(requested_valid_until::text,''), coalesce(nullif(btrim(requested_payment_terms),''),''), coalesce(nullif(btrim(requested_delivery_terms),''),''), coalesce(requested_expected_delivery_date::text,''), requested_lines::text,
    coalesce((select string_agg(concat_ws(':',q.id,q.updated_at,q.current_version_id,q.status),',' order by q.id) from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=currency_value and q.archived_at is null),'')));
  select c.id into existing_case_id from public.execution_cases c where c.company_id=target_company_id and c.case_type='quote_preparation' and c.source_fingerprint=source_hash and c.status in ('detected','prepared','awaiting_review','approved','executing','executed') and c.archived_at is null order by c.created_at desc limit 1;
  if existing_case_id is not null then return query select existing_case_id, false; return; end if;

  quality := case when missing_count > 0 then 'insufficient' when accepted_count >= 2 and target_opportunity_id is not null and target_contact_id is not null then 'high' when comparable_count > 0 and target_opportunity_id is not null then 'medium' else 'low' end;
  perform set_config('octo.execution_case_write','on',true);
  insert into public.execution_cases(company_id,case_type,status,target_party_id,target_contact_id,target_opportunity_id,target_quote_id,responsible_user_id,trigger_type,review_due_at,ruleset_key,ruleset_version,evidence_quality,summary,primary_recommendation,source_fingerprint,created_by)
  values(target_company_id,'quote_preparation','detected',target_party_id,target_contact_id,target_opportunity_id,target_quote_id,owner_id,requested_trigger_type,requested_review_due_at,'quote-preparation-v1','1.0.0',quality,
    party_row.display_name || ' için teklif çalışması hazırlandı.',
    case when missing_count > 0 or requested_valid_until is null or nullif(btrim(requested_payment_terms),'') is null then 'Eksik ticari bilgileri tamamlayın ve hazırlanan teklifi inceleyin.' else 'Kanıtları ve varsayımları inceleyip teklifi onaylayın.' end,
    source_hash,actor_id) returning id into created_case_id;
  perform set_config('octo.execution_case_write','',true);
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,created_case_id,'case_detected','user',actor_id,jsonb_build_object('trigger_type',requested_trigger_type));

  insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,metadata)
  values(target_company_id,created_case_id,'party_context','crm','business_party',party_row.id,party_row.updated_at,'Firma',party_row.display_name,jsonb_build_object('relationship_status',party_row.relationship_status));
  if target_contact_id is not null then insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,metadata) values(target_company_id,created_case_id,'contact_context','crm','business_contact',contact_row.id,contact_row.updated_at,'Kişi',concat_ws(' ',contact_row.first_name,contact_row.last_name),jsonb_build_object('decision_role',contact_row.decision_role,'is_primary',contact_row.is_primary)); end if;
  if target_opportunity_id is not null then insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,currency,amount,metadata) values(target_company_id,created_case_id,'opportunity_context','sales','sales_opportunity',opportunity_row.id,opportunity_row.updated_at,'Fırsat',opportunity_row.title,opportunity_row.currency,opportunity_row.expected_value,jsonb_build_object('stage_id',opportunity_row.stage_id,'expected_close_date',opportunity_row.expected_close_date,'next_action',opportunity_row.next_action,'product_interest',opportunity_row.product_interest)); end if;
  insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,currency,amount,metadata)
  select target_company_id,created_case_id,'comparable_quote','sales','sales_quote',q.id,q.updated_at,'Karşılaştırılabilir teklif',q.quote_number,q.currency,qv.grand_total,
    jsonb_build_object('status',q.status,'issue_date',q.issue_date,'valid_until',q.valid_until,'payment_terms',q.payment_terms,'version_number',qv.version_number)
  from public.sales_quotes q join public.sales_quote_versions qv on qv.id=q.current_version_id
  where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=currency_value and q.archived_at is null and q.id is distinct from target_quote_id
  order by (q.status='accepted') desc,q.issue_date desc limit 8;
  insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,currency,amount,metadata)
  select target_company_id,created_case_id,'payment_warning','finance','finance_invoice',i.id,coalesce(i.paid_at,i.updated_at),'Gecikmiş fatura',i.invoice_number,i.currency,i.outstanding_amount,jsonb_build_object('status',i.status,'due_date',i.due_date)
  from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.archived_at is null and i.status in ('issued','partially_paid') and i.due_date < current_date and i.outstanding_amount > 0 order by i.due_date limit 5;
  insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,metadata)
  select target_company_id,created_case_id,'customer_health','customer_health','customer_health_assessment',h.id,h.evaluated_at,'Müşteri Sağlığı',h.summary,jsonb_build_object('status',h.health_status,'data_sufficiency',h.data_sufficiency,'confidence',h.confidence,'ruleset_version',h.ruleset_version)
  from public.customer_health_assessments h where h.company_id=target_company_id and h.party_id=target_party_id and h.is_current limit 1;
  insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,source_record_id,observed_at,label,safe_summary,metadata)
  select target_company_id,created_case_id,'activity_metadata','sales','sales_activity',a.id,a.activity_at,'Şirket görünür aktivite',coalesce(a.title,a.activity_type),jsonb_build_object('activity_type',a.activity_type,'completed',a.completed_at is not null)
  from public.sales_activities a where a.company_id=target_company_id and a.party_id=target_party_id and a.visibility='company' and a.archived_at is null order by a.activity_at desc limit 5;

  insert into public.execution_assumptions(company_id,case_id,assumption_key,label,value,source,confidence,requires_confirmation)
  values
    (target_company_id,created_case_id,'delivery_not_validated','Teslimat bilgisi doğrulanmış Operasyon veya stok kaynağına dayanmıyor.',jsonb_build_object('delivery_terms',nullif(btrim(requested_delivery_terms),''),'expected_delivery_date',requested_expected_delivery_date),'user_input','high',true),
    (target_company_id,created_case_id,'cost_unavailable','Güvenilir maliyet kaynağı bulunmadığından marj güvenliği değerlendirilmedi.','true'::jsonb,'structured_record','high',false),
    (target_company_id,created_case_id,'relationship_quality_unavailable','İnsan ilişkisi ve rapport kalitesi yapılandırılmış veride temsil edilmiyor.','true'::jsonb,'structured_record','high',false);
  for position_value in 1..jsonb_array_length(prepared_lines) loop
    if (prepared_lines->(position_value-1)->'unit_price') = 'null'::jsonb then
      insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,'lines.'||position_value||'.unit_price',position_value||'. kalem için savunulabilir birim fiyat','critical',true,'number');
    end if;
  end loop;
  if requested_valid_until is null then insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,'valid_until','Teklif geçerlilik tarihi','critical',true,'date'); end if;
  if nullif(btrim(requested_payment_terms),'') is null then insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,'payment_terms','Ödeme koşulları','critical',true,'text'); end if;
  insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,'delivery_confirmation','Teslimat varsayımı insan tarafından doğrulanmalı','warning',true,'boolean');

  insert into public.execution_artifacts(company_id,case_id,artifact_type,version_number,content,source_fingerprint,prepared_by)
  select target_company_id,created_case_id,'quote_draft',1,
    jsonb_build_object('party_id',target_party_id,'contact_id',target_contact_id,'opportunity_id',target_opportunity_id,'owner_user_id',owner_id,'currency',currency_value,'issue_date',current_date,'valid_until',requested_valid_until,'payment_terms',nullif(btrim(requested_payment_terms),''),'delivery_terms',nullif(btrim(requested_delivery_terms),''),'expected_delivery_date',requested_expected_delivery_date,'customer_notes',nullif(btrim(requested_customer_notes),''),'internal_notes',nullif(btrim(requested_internal_notes),''),'lines',prepared_lines,'warnings',jsonb_build_array('Maliyet verisi yok; marj değerlendirilmedi.','Teslimat doğrulanmış Operasyon kaynağına dayanmıyor.')),
    source_hash,actor_id;
  insert into public.execution_artifacts(company_id,case_id,artifact_type,version_number,content,source_fingerprint,prepared_by)
  select target_company_id,created_case_id,'internal_review_summary',1,
    jsonb_build_object('headline',party_row.display_name||' için teklif incelemesi','evidence',jsonb_build_array(comparable_count||' aynı firma ve para birimindeki teklif kaydı',accepted_count||' kabul edilmiş teklif kaydı'),'proposed',jsonb_build_object('currency',currency_value,'line_count',line_count),'review_required',jsonb_build_array('Teslimat varsayımı doğrulanmalı.','Maliyet verisi yok; marj değerlendirilmedi.','İlişki kalitesi yapılandırılmış veride temsil edilmiyor.')),
    source_hash,actor_id;
  insert into public.execution_artifacts(company_id,case_id,artifact_type,version_number,content,source_fingerprint,prepared_by)
  select target_company_id,created_case_id,'cover_email_draft',1,
    jsonb_build_object('subject','Teklifimiz hakkında','body','Merhaba,\n\n'||coalesce(opportunity_row.title,party_row.display_name||' için talebiniz')||' kapsamında hazırladığımız teklif taslağını incelemenize sunuyoruz. Ticari koşulları birlikte değerlendirebiliriz.\n\nSaygılarımızla','template_key','quote-cover-v1','send_status','not_sent'),
    source_hash,actor_id;
  perform set_config('octo.execution_case_write','on',true);
  update public.execution_cases set status='awaiting_review',prepared_at=now(),updated_at=now() where id=created_case_id;
  perform set_config('octo.execution_case_write','',true);
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values
    (target_company_id,created_case_id,'case_prepared','system',null,jsonb_build_object('ruleset_key','quote-preparation-v1','ruleset_version','1.0.0','evidence_quality',quality)),
    (target_company_id,created_case_id,'artifact_version_created','system',null,jsonb_build_object('version_number',1,'artifact_types',jsonb_build_array('quote_draft','internal_review_summary','cover_email_draft'))),
    (target_company_id,created_case_id,'awaiting_review','system',null,jsonb_build_object('blocking_missing_input_count',(select count(*) from public.execution_missing_inputs m where m.case_id=created_case_id and m.blocking)));
  return query select created_case_id, true;
end $$;

create or replace function public.refresh_quote_execution_case(target_company_id uuid, target_case_id uuid)
returns table(case_id uuid, created_new boolean)
language plpgsql security definer set search_path = '' as $$
declare c public.execution_cases%rowtype; a public.execution_artifacts%rowtype; result record;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id and x.case_type='quote_preparation';
  if not found or c.status not in ('prepared','awaiting_review','failed') then raise exception 'Case cannot be refreshed' using errcode='23514'; end if;
  select * into a from public.execution_artifacts x where x.case_id=c.id and x.company_id=c.company_id and x.artifact_type='quote_draft' and x.superseded_at is null;
  select * into result from public.prepare_quote_execution_case(target_company_id,c.target_party_id,c.target_contact_id,c.target_opportunity_id,c.target_quote_id,c.responsible_user_id,c.trigger_type,a.content->>'currency',nullif(a.content->>'valid_until','')::date,a.content->>'payment_terms',a.content->>'delivery_terms',nullif(a.content->>'expected_delivery_date','')::date,a.content->>'customer_notes',a.content->>'internal_notes',a.content->'lines',c.review_due_at);
  if result.case_id <> c.id and result.created_new then
    perform set_config('octo.execution_case_write','on',true);
    update public.execution_cases set replaces_case_id=c.id where id=result.case_id;
    update public.execution_cases set status='cancelled',archived_at=now(),updated_at=now() where id=c.id;
    perform set_config('octo.execution_case_write','',true);
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'case_replaced','user',auth.uid(),jsonb_build_object('replacement_case_id',result.case_id));
  else
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'case_refreshed','user',auth.uid(),jsonb_build_object('source_unchanged',true));
  end if;
  return query select result.case_id,result.created_new;
end $$;

create or replace function public.resolve_execution_missing_input(target_company_id uuid,target_case_id uuid,target_input_key text,resolution jsonb)
returns public.execution_missing_inputs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); c public.execution_cases%rowtype; m public.execution_missing_inputs%rowtype; updated_row public.execution_missing_inputs%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id for update;
  if not found or c.status not in ('prepared','awaiting_review','failed') then raise exception 'Case cannot accept missing input' using errcode='23514'; end if;
  select * into m from public.execution_missing_inputs x where x.case_id=c.id and x.company_id=c.company_id and x.input_key=target_input_key;
  if not found then raise exception 'Missing input not found' using errcode='P0002'; end if;
  if resolution is null or resolution = 'null'::jsonb then raise exception 'Resolution is required' using errcode='23514'; end if;
  if m.resolution_type='number' and (jsonb_typeof(resolution)<>'number' or (resolution#>>'{}')::numeric<=0) then raise exception 'Positive number is required' using errcode='23514'; end if;
  if m.resolution_type='text' and (jsonb_typeof(resolution)<>'string' or nullif(btrim(resolution#>>'{}'),'') is null) then raise exception 'Text resolution is required' using errcode='23514'; end if;
  if m.resolution_type='date' and ((resolution#>>'{}')::date < current_date) then raise exception 'Current or future date is required' using errcode='23514'; end if;
  if target_input_key='delivery_confirmation' and resolution <> 'true'::jsonb then raise exception 'Delivery assumption must be explicitly confirmed' using errcode='23514'; end if;
  perform set_config('octo.execution_controlled_write','on',true);
  update public.execution_missing_inputs set resolved_value=resolution,resolved_by=actor_id,resolved_at=now() where id=m.id returning * into updated_row;
  if target_input_key='delivery_confirmation' then update public.execution_assumptions set confirmed_by=actor_id,confirmed_at=now() where case_id=c.id and assumption_key='delivery_not_validated'; end if;
  perform set_config('octo.execution_controlled_write','',true);
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'missing_input_resolved','user',actor_id,jsonb_build_object('input_key',target_input_key));
  return updated_row;
end $$;

create or replace function public.save_quote_execution_review(target_company_id uuid,target_case_id uuid,reviewed_content jsonb,edit_category text default 'other',edit_reason text default null)
returns public.execution_artifacts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); c public.execution_cases%rowtype; current_artifact public.execution_artifacts%rowtype; new_artifact public.execution_artifacts%rowtype; next_version integer; field_name text; old_line jsonb; new_line jsonb; line_position integer;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if edit_category not in ('commercial_judgment','missing_context','customer_relationship','pricing','discount','payment_terms','delivery','wording','error_correction','other') then raise exception 'Invalid edit category' using errcode='23514'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id for update;
  if not found or c.status not in ('prepared','awaiting_review','failed') then raise exception 'Case cannot be edited' using errcode='23514'; end if;
  if jsonb_typeof(reviewed_content)<>'object' or jsonb_typeof(reviewed_content->'lines')<>'array' then raise exception 'Invalid quote draft artifact' using errcode='23514'; end if;
  select * into current_artifact from public.execution_artifacts x where x.case_id=c.id and x.artifact_type='quote_draft' and x.superseded_at is null for update;
  if current_artifact.content = reviewed_content then return current_artifact; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.execution_artifacts where case_id=c.id and artifact_type='quote_draft';
  perform set_config('octo.execution_controlled_write','on',true);
  update public.execution_artifacts set superseded_at=now() where id=current_artifact.id;
  perform set_config('octo.execution_controlled_write','',true);
  insert into public.execution_artifacts(company_id,case_id,artifact_type,version_number,content,source_fingerprint,prepared_by) values(target_company_id,c.id,'quote_draft',next_version,reviewed_content,c.source_fingerprint,actor_id) returning * into new_artifact;
  foreach field_name in array array['contact_id','currency','valid_until','payment_terms','delivery_terms','expected_delivery_date','customer_notes','internal_notes'] loop
    if current_artifact.content->field_name is distinct from reviewed_content->field_name then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,field_name,current_artifact.content->field_name,reviewed_content->field_name,edit_category,actor_id); end if;
  end loop;
  for new_line in select value from jsonb_array_elements(reviewed_content->'lines') loop
    line_position := (new_line->>'position')::integer;
    select value into old_line from jsonb_array_elements(current_artifact.content->'lines') where (value->>'position')::integer=line_position;
    if old_line is null then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,'lines.'||line_position,null,new_line,edit_category,actor_id);
    else
      foreach field_name in array array['item_code','description','quantity','unit','unit_price','discount_type','discount_value','vat_rate','other_tax_rate'] loop
        if old_line->field_name is distinct from new_line->field_name then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,'lines.'||line_position||'.'||field_name,old_line->field_name,new_line->field_name,edit_category,actor_id); end if;
      end loop;
    end if;
  end loop;
  for old_line in select value from jsonb_array_elements(current_artifact.content->'lines') loop
    line_position := (old_line->>'position')::integer;
    if not exists(select 1 from jsonb_array_elements(reviewed_content->'lines') x where (x->>'position')::integer=line_position) then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,'lines.'||line_position,old_line,null,edit_category,actor_id); end if;
  end loop;
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'artifact_version_created','user',actor_id,jsonb_build_object('artifact_type','quote_draft','version_number',next_version,'edit_category',edit_category,'reason',nullif(btrim(edit_reason),'')));
  return new_artifact;
end $$;

create or replace function public.approve_quote_execution_case(target_company_id uuid,target_case_id uuid,reviewed_content jsonb default null,edit_category text default 'other',edit_reason text default null)
returns table(case_id uuid,quote_id uuid,quote_number text,execution_succeeded boolean,error_code text)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); c public.execution_cases%rowtype; a public.execution_artifacts%rowtype; decision_value text; created_quote_id uuid; created_number text; created_version_id uuid; line jsonb; execution_error text;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id for update;
  if not found then raise exception 'Case not found' using errcode='P0002'; end if;
  if c.executed_quote_id is not null then select quote_number into created_number from public.sales_quotes where id=c.executed_quote_id; return query select c.id,c.executed_quote_id,created_number,true,null::text; return; end if;
  if c.status not in ('awaiting_review','failed') then raise exception 'Case is not awaiting approval or retry' using errcode='23514'; end if;
  if reviewed_content is not null then perform public.save_quote_execution_review(target_company_id,target_case_id,reviewed_content,edit_category,edit_reason); end if;
  select * into a from public.execution_artifacts x where x.case_id=c.id and x.artifact_type='quote_draft' and x.superseded_at is null;
  if exists(select 1 from public.execution_missing_inputs m where m.case_id=c.id and m.blocking and m.resolved_at is null) then raise exception 'Blocking inputs must be resolved before approval' using errcode='23514'; end if;
  if nullif(a.content->>'currency','') is null or nullif(a.content->>'valid_until','') is null or nullif(btrim(a.content->>'payment_terms'),'') is null or jsonb_typeof(a.content->'lines')<>'array' or jsonb_array_length(a.content->'lines')=0 then raise exception 'Quotation required fields are incomplete' using errcode='23514'; end if;
  if (a.content->>'valid_until')::date < current_date then raise exception 'Quotation validity cannot be in the past' using errcode='23514'; end if;
  for line in select value from jsonb_array_elements(a.content->'lines') loop
    if nullif(btrim(line->>'description'),'') is null or nullif(btrim(line->>'unit'),'') is null or nullif(line->>'quantity','')::numeric<=0 or nullif(line->>'unit_price','')::numeric<=0 then raise exception 'Every quotation line requires description, quantity, unit and positive price' using errcode='23514'; end if;
  end loop;
  if not exists(select 1 from public.business_parties p where p.id=c.target_party_id and p.company_id=c.company_id and p.archived_at is null) then raise exception 'Party is no longer active' using errcode='23514'; end if;
  if nullif(a.content->>'contact_id','') is not null and not exists(select 1 from public.business_contacts x where x.id=(a.content->>'contact_id')::uuid and x.company_id=c.company_id and x.party_id=c.target_party_id and x.archived_at is null) then raise exception 'Contact is no longer valid' using errcode='23514'; end if;
  if c.status='awaiting_review' then
    decision_value := case when a.version_number>1 then 'approve_with_edits' else 'approve' end;
    insert into public.execution_decisions(company_id,case_id,decision,reason_code,reason_text,decision_snapshot,decided_by) values(target_company_id,c.id,decision_value,case when a.version_number>1 then edit_category end,nullif(btrim(edit_reason),''),jsonb_build_object('artifact_id',a.id,'artifact_version',a.version_number,'quote_draft',a.content),actor_id);
    perform set_config('octo.execution_case_write','on',true);
    update public.execution_cases set status='approved',approved_at=now(),updated_at=now() where id=c.id;
    perform set_config('octo.execution_case_write','',true);
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,decision_value||'d','user',actor_id,jsonb_build_object('artifact_id',a.id,'artifact_version',a.version_number));
  elsif not exists(select 1 from public.execution_decisions d where d.case_id=c.id and d.decision in ('approve','approve_with_edits')) then raise exception 'Failed case has no approval decision' using errcode='23514'; end if;
  begin
    perform set_config('octo.execution_case_write','on',true); update public.execution_cases set status='executing',updated_at=now() where id=c.id; perform set_config('octo.execution_case_write','',true);
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'execution_started','system',null,jsonb_build_object('artifact_id',a.id));
    created_number:=public.next_sales_quote_number(target_company_id,current_date);
    insert into public.sales_quotes(company_id,quote_number,party_id,contact_id,opportunity_id,owner_user_id,currency,issue_date,valid_until,payment_terms,delivery_terms,expected_delivery_date,customer_notes,internal_notes,approval_required,approval_reason,created_by,updated_by)
    values(target_company_id,created_number,c.target_party_id,nullif(a.content->>'contact_id','')::uuid,c.target_opportunity_id,c.responsible_user_id,a.content->>'currency',current_date,(a.content->>'valid_until')::date,nullif(btrim(a.content->>'payment_terms'),''),nullif(btrim(a.content->>'delivery_terms'),''),nullif(a.content->>'expected_delivery_date','')::date,nullif(btrim(a.content->>'customer_notes'),''),nullif(btrim(a.content->>'internal_notes'),''),false,null,actor_id,actor_id) returning id into created_quote_id;
    created_version_id:=public.insert_sales_quote_version(target_company_id,created_quote_id,1,'Assisted Execution onayıyla oluşturuldu',a.content->'lines',actor_id);
    update public.sales_quotes set current_version_id=created_version_id where id=created_quote_id;
    insert into public.sales_quote_status_history(company_id,quote_id,from_status,to_status,changed_by,reason) values(target_company_id,created_quote_id,null,'draft',actor_id,'Assisted Execution onayıyla teklif oluşturuldu');
    perform set_config('octo.execution_case_write','on',true); update public.execution_cases set status='executed',executed_quote_id=created_quote_id,executed_at=now(),updated_at=now() where id=c.id; perform set_config('octo.execution_case_write','',true);
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'execution_succeeded','system',null,jsonb_build_object('quote_id',created_quote_id,'quote_number',created_number));
    insert into public.execution_outcomes(company_id,case_id,outcome_type,source_domain,source_record_id,observed_at,currency,classification,conclusive,notes) values(target_company_id,c.id,'quotation_created','quotations',created_quote_id,now(),a.content->>'currency','draft_created',true,'Assisted preparation followed by explicit human approval.');
    return query select c.id,created_quote_id,created_number,true,null::text;
  exception when others then
    execution_error:=sqlstate;
    perform set_config('octo.execution_case_write','on',true); update public.execution_cases set status='failed',updated_at=now() where id=c.id; perform set_config('octo.execution_case_write','',true);
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'execution_failed','system',null,jsonb_build_object('error_code',execution_error));
    return query select c.id,null::uuid,null::text,false,execution_error;
  end;
end $$;

create or replace function public.retry_quote_execution_case(target_company_id uuid,target_case_id uuid)
returns table(case_id uuid,quote_id uuid,quote_number text,execution_succeeded boolean,error_code text)
language sql security definer set search_path = '' as $$
  select * from public.approve_quote_execution_case(target_company_id,target_case_id,null,'other','Yetkili yeniden deneme');
$$;

create or replace function public.submit_execution_case_decision(target_company_id uuid,target_case_id uuid,decision_value text,reason_code_value text default null,reason_text_value text default null)
returns public.execution_cases language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); c public.execution_cases%rowtype; updated_case public.execution_cases%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if decision_value not in ('reject','cancel') then raise exception 'Use approval operation for approval decisions' using errcode='23514'; end if;
  if decision_value='reject' and nullif(btrim(reason_code_value),'') is null then raise exception 'Rejection reason category is required' using errcode='23514'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id for update;
  if not found or c.status not in ('detected','prepared','awaiting_review','failed') then raise exception 'Invalid terminal decision' using errcode='23514'; end if;
  insert into public.execution_decisions(company_id,case_id,decision,reason_code,reason_text,decision_snapshot,decided_by) values(target_company_id,c.id,decision_value,nullif(btrim(reason_code_value),''),nullif(btrim(reason_text_value),''),jsonb_build_object('previous_status',c.status),actor_id);
  perform set_config('octo.execution_case_write','on',true);
  update public.execution_cases set status=case when decision_value='reject' then 'rejected' else 'cancelled' end,updated_at=now() where id=c.id returning * into updated_case;
  perform set_config('octo.execution_case_write','',true);
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,case when decision_value='reject' then 'rejected' else 'cancelled' end,'user',actor_id,jsonb_build_object('reason_code',nullif(btrim(reason_code_value),'')));
  return updated_case;
end $$;

create or replace function public.record_execution_quote_outcome()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.execution_cases%rowtype; mapped_type text;
begin
  select * into c from public.execution_cases x where x.executed_quote_id=new.quote_id and x.company_id=new.company_id;
  if not found then return new; end if;
  mapped_type:=case new.to_status when 'sent' then 'quotation_sent' when 'viewed' then 'quotation_viewed' when 'revision_requested' then 'quotation_revision_requested' when 'accepted' then 'quotation_accepted' when 'rejected' then 'quotation_rejected' when 'expired' then 'quotation_expired' end;
  if mapped_type is not null then
    insert into public.execution_outcomes(company_id,case_id,outcome_type,source_domain,source_record_id,observed_at,currency,classification,conclusive,notes)
    select c.company_id,c.id,mapped_type,'quotations',new.quote_id,new.changed_at,q.currency,new.to_status,new.to_status in ('accepted','rejected','expired'),'Observed from the quotation domain status history.' from public.sales_quotes q where q.id=new.quote_id on conflict do nothing;
    insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(c.company_id,c.id,'quotation_status_outcome_observed','system',null,jsonb_build_object('quote_id',new.quote_id,'status',new.to_status));
    if new.to_status in ('accepted','rejected','expired') then perform set_config('octo.execution_case_write','on',true); update public.execution_cases set status='completed',completed_at=now(),updated_at=now() where id=c.id and status='executed'; perform set_config('octo.execution_case_write','',true); end if;
  end if;
  return new;
end $$;

create or replace function public.record_execution_quote_revision_outcome()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.execution_cases%rowtype;
begin
  if new.version_number <= 1 then return new; end if;
  select * into c from public.execution_cases x where x.executed_quote_id=new.quote_id and x.company_id=new.company_id;
  if found then insert into public.execution_outcomes(company_id,case_id,outcome_type,source_domain,source_record_id,observed_at,classification,conclusive,notes) values(c.company_id,c.id,'quotation_revision_created','quotations',new.id,new.created_at,'revision_created',true,'Observed from the quotation domain version record.') on conflict do nothing; insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(c.company_id,c.id,'quotation_revision_observed','system',null,jsonb_build_object('quote_id',new.quote_id,'version_id',new.id,'version_number',new.version_number)); end if;
  return new;
end $$;

create or replace function public.record_execution_sales_order_outcome()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.execution_cases%rowtype;
begin
  select * into c from public.execution_cases x where x.executed_quote_id=new.source_quote_id and x.company_id=new.company_id;
  if found then insert into public.execution_outcomes(company_id,case_id,outcome_type,source_domain,source_record_id,observed_at,outcome_value,currency,classification,conclusive,notes) values(c.company_id,c.id,'sales_order_created','sales_orders',new.id,new.created_at,new.grand_total,new.currency,'converted_to_sales_order',true,'Observed from the Sales Order domain conversion.') on conflict do nothing; insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(c.company_id,c.id,'sales_order_conversion_observed','system',null,jsonb_build_object('sales_order_id',new.id,'source_quote_id',new.source_quote_id)); end if;
  return new;
end $$;

create trigger execution_quote_status_outcomes after insert on public.sales_quote_status_history for each row execute function public.record_execution_quote_outcome();
create trigger execution_quote_revision_outcomes after insert on public.sales_quote_versions for each row execute function public.record_execution_quote_revision_outcome();
create trigger execution_sales_order_outcomes after insert on public.sales_orders for each row execute function public.record_execution_sales_order_outcome();

revoke all on function public.protect_execution_immutable() from public,anon,authenticated;
revoke all on function public.protect_execution_case() from public,anon,authenticated;
revoke all on function public.protect_execution_controlled_update() from public,anon,authenticated;
revoke all on function public.record_execution_quote_outcome() from public,anon,authenticated;
revoke all on function public.record_execution_quote_revision_outcome() from public,anon,authenticated;
revoke all on function public.record_execution_sales_order_outcome() from public,anon,authenticated;
revoke all on function public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz) from public,anon;
revoke all on function public.refresh_quote_execution_case(uuid,uuid) from public,anon;
revoke all on function public.resolve_execution_missing_input(uuid,uuid,text,jsonb) from public,anon;
revoke all on function public.save_quote_execution_review(uuid,uuid,jsonb,text,text) from public,anon;
revoke all on function public.approve_quote_execution_case(uuid,uuid,jsonb,text,text) from public,anon;
revoke all on function public.retry_quote_execution_case(uuid,uuid) from public,anon;
revoke all on function public.submit_execution_case_decision(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz) to authenticated;
grant execute on function public.refresh_quote_execution_case(uuid,uuid) to authenticated;
grant execute on function public.resolve_execution_missing_input(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.save_quote_execution_review(uuid,uuid,jsonb,text,text) to authenticated;
grant execute on function public.approve_quote_execution_case(uuid,uuid,jsonb,text,text) to authenticated;
grant execute on function public.retry_quote_execution_case(uuid,uuid) to authenticated;
grant execute on function public.submit_execution_case_decision(uuid,uuid,text,text,text) to authenticated;

alter table public.execution_cases enable row level security;
alter table public.execution_evidence enable row level security;
alter table public.execution_assumptions enable row level security;
alter table public.execution_missing_inputs enable row level security;
alter table public.execution_artifacts enable row level security;
alter table public.execution_decisions enable row level security;
alter table public.execution_field_edits enable row level security;
alter table public.execution_events enable row level security;
alter table public.execution_outcomes enable row level security;

revoke all on table public.execution_cases,public.execution_evidence,public.execution_assumptions,public.execution_missing_inputs,public.execution_artifacts,public.execution_decisions,public.execution_field_edits,public.execution_events,public.execution_outcomes from public,anon,authenticated;
grant select on table public.execution_cases,public.execution_evidence,public.execution_assumptions,public.execution_missing_inputs,public.execution_artifacts,public.execution_decisions,public.execution_field_edits,public.execution_events,public.execution_outcomes to authenticated;

create policy execution_cases_read on public.execution_cases for select to authenticated using(public.is_company_member(company_id));
create policy execution_evidence_read on public.execution_evidence for select to authenticated using(public.is_company_member(company_id));
create policy execution_assumptions_read on public.execution_assumptions for select to authenticated using(public.is_company_member(company_id));
create policy execution_missing_inputs_read on public.execution_missing_inputs for select to authenticated using(public.is_company_member(company_id));
create policy execution_artifacts_read on public.execution_artifacts for select to authenticated using(public.is_company_member(company_id));
create policy execution_decisions_read on public.execution_decisions for select to authenticated using(public.is_company_member(company_id));
create policy execution_field_edits_read on public.execution_field_edits for select to authenticated using(public.is_company_member(company_id));
create policy execution_events_read on public.execution_events for select to authenticated using(public.is_company_member(company_id));
create policy execution_outcomes_read on public.execution_outcomes for select to authenticated using(public.is_company_member(company_id));

comment on table public.execution_cases is 'Company-scoped, controlled workflow cases; source domains remain authoritative.';
comment on table public.execution_evidence is 'Immutable safe structured evidence snapshots; private bodies and sensitive identifiers are excluded.';
comment on table public.execution_outcomes is 'Trusted observations from source-domain transitions without causal claims.';
