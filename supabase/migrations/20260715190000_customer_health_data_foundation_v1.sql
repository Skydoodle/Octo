-- Octo Customer Health and Revenue Risk Data Foundation V1

create table public.customer_health_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null,
  health_status text not null check (health_status in ('healthy','watch','risky','critical','insufficient_data')),
  data_sufficiency text not null check (data_sufficiency in ('sufficient','partial','insufficient')),
  confidence text not null check (confidence in ('high','medium','low')),
  summary text not null check (char_length(btrim(summary)) > 0),
  primary_risk_code text,
  evaluated_on date not null,
  evaluated_at timestamptz not null default now(),
  window_start date not null,
  window_end date not null,
  ruleset_version text not null,
  source_fingerprint text not null,
  is_current boolean not null default true,
  superseded_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(id,company_id), unique(id,party_id),
  constraint customer_health_assessment_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  check(window_start <= window_end),
  check((is_current and superseded_at is null) or (not is_current and superseded_at is not null))
);
create unique index customer_health_one_current on public.customer_health_assessments(company_id,party_id) where is_current;
create index customer_health_assessment_company_status_idx on public.customer_health_assessments(company_id,health_status,evaluated_on desc);
create index customer_health_assessment_party_idx on public.customer_health_assessments(company_id,party_id,evaluated_on desc);

create table public.customer_health_factors (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null, assessment_id uuid not null,
  factor_code text not null,
  source_domain text not null check(source_domain in ('sales','finance','relationship')),
  direction text not null check(direction in ('positive','negative','neutral')),
  severity text not null check(severity in ('info','warning','critical')),
  title text not null check(char_length(btrim(title))>0), explanation text not null check(char_length(btrim(explanation))>0), recommendation text,
  observed_at timestamptz, period_start date, period_end date, currency text check(currency is null or currency in ('TRY','EUR','USD','GBP')),
  metric_value numeric, baseline_value numeric, threshold_value numeric, delta_pct numeric,
  amount numeric(18,2), evidence_count integer not null default 0 check(evidence_count>=0), created_at timestamptz not null default now(),
  constraint customer_health_factor_assessment_company_fk foreign key(assessment_id,company_id) references public.customer_health_assessments(id,company_id) on delete cascade,
  constraint customer_health_factor_assessment_party_fk foreign key(assessment_id,party_id) references public.customer_health_assessments(id,party_id) on delete cascade,
  constraint customer_health_factor_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  check(amount is null or currency is not null),
  unique(assessment_id,factor_code,currency)
);
create index customer_health_factors_assessment_idx on public.customer_health_factors(assessment_id,severity);
create index customer_health_factors_company_code_idx on public.customer_health_factors(company_id,factor_code);

create table public.customer_health_evidence (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null, assessment_id uuid not null, factor_id uuid not null references public.customer_health_factors(id) on delete cascade,
  source_type text not null check(source_type in ('sales_activity','sales_quote','sales_order','finance_invoice','finance_payment')),
  source_id uuid not null, observed_at timestamptz, label text not null check(char_length(btrim(label))>0),
  amount numeric(18,2), currency text check(currency is null or currency in ('TRY','EUR','USD','GBP')), created_at timestamptz not null default now(),
  constraint customer_health_evidence_assessment_company_fk foreign key(assessment_id,company_id) references public.customer_health_assessments(id,company_id) on delete cascade,
  constraint customer_health_evidence_assessment_party_fk foreign key(assessment_id,party_id) references public.customer_health_assessments(id,party_id) on delete cascade,
  constraint customer_health_evidence_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  check(amount is null or currency is not null), unique(assessment_id,factor_id,source_type,source_id)
);
create index customer_health_evidence_factor_idx on public.customer_health_evidence(factor_id,observed_at);

create table public.customer_health_currency_contexts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null, assessment_id uuid not null, currency text not null check(currency in ('TRY','EUR','USD','GBP')),
  completed_order_count_12m integer not null default 0 check(completed_order_count_12m>=0), completed_order_value_12m numeric(18,2) not null default 0 check(completed_order_value_12m>=0),
  recent_order_count_90d integer not null default 0 check(recent_order_count_90d>=0), recent_order_value_90d numeric(18,2) not null default 0 check(recent_order_value_90d>=0),
  previous_order_count_90d integer not null default 0 check(previous_order_count_90d>=0), previous_order_value_90d numeric(18,2) not null default 0 check(previous_order_value_90d>=0),
  open_receivable numeric(18,2) not null default 0 check(open_receivable>=0), overdue_receivable numeric(18,2) not null default 0 check(overdue_receivable>=0),
  recent_quote_count_180d integer not null default 0 check(recent_quote_count_180d>=0), recent_quote_value_180d numeric(18,2) not null default 0 check(recent_quote_value_180d>=0),
  accepted_quote_count_180d integer not null default 0 check(accepted_quote_count_180d>=0), rejected_quote_count_180d integer not null default 0 check(rejected_quote_count_180d>=0), expired_quote_count_180d integer not null default 0 check(expired_quote_count_180d>=0),
  created_at timestamptz not null default now(),
  constraint customer_health_context_assessment_company_fk foreign key(assessment_id,company_id) references public.customer_health_assessments(id,company_id) on delete cascade,
  constraint customer_health_context_assessment_party_fk foreign key(assessment_id,party_id) references public.customer_health_assessments(id,party_id) on delete cascade,
  constraint customer_health_context_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id), unique(assessment_id,currency)
);
create index customer_health_context_company_party_idx on public.customer_health_currency_contexts(company_id,party_id);

alter table public.customer_health_assessments enable row level security;
alter table public.customer_health_factors enable row level security;
alter table public.customer_health_evidence enable row level security;
alter table public.customer_health_currency_contexts enable row level security;
create policy customer_health_assessments_read on public.customer_health_assessments for select to authenticated using(public.is_company_member(company_id));
create policy customer_health_factors_read on public.customer_health_factors for select to authenticated using(public.is_company_member(company_id));
create policy customer_health_evidence_read on public.customer_health_evidence for select to authenticated using(public.is_company_member(company_id));
create policy customer_health_contexts_read on public.customer_health_currency_contexts for select to authenticated using(public.is_company_member(company_id));
revoke all on public.customer_health_assessments,public.customer_health_factors,public.customer_health_evidence,public.customer_health_currency_contexts from public,anon,authenticated;
grant select on public.customer_health_assessments,public.customer_health_factors,public.customer_health_evidence,public.customer_health_currency_contexts to authenticated;

create or replace function public.refresh_customer_health_assessment(target_company_id uuid,target_party_id uuid,evaluation_date date default current_date)
returns table(assessment_id uuid,health_status text,data_sufficiency text,confidence text,created_new boolean)
language plpgsql security definer set search_path=''
as $$
declare
  actor_id uuid:=auth.uid(); eval_date date:=coalesce(evaluation_date,current_date); ruleset constant text:='customer-health-v1'; fingerprint text;
  existing public.customer_health_assessments%rowtype; new_id uuid; domains integer:=0; suff text; conf text; result_status text; primary_code text;
  warnings integer:=0; criticals integer:=0; warning_sales boolean:=false; warning_finance boolean:=false; positives integer:=0;
  cur record; rec record; factor_id uuid; eligible integer; late_count integer; avg_delay numeric; ontime_ratio numeric;
  order_count integer; last_order date; median_interval numeric; current_gap integer; decline numeric;
  terminal_count integer; accepted_count integer; rejected_count integer; expired_count integer; acceptance_ratio numeric;
  last_activity date; activity_gap integer;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Customer health refresh requires company operator access' using errcode='42501'; end if;
  if eval_date is null then raise exception 'Evaluation date is required' using errcode='22023'; end if;
  perform 1 from public.business_parties p where p.id=target_party_id and p.company_id=target_company_id and p.archived_at is null and p.relationship_status='active' for update;
  if not found then raise exception 'Active business party not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_company_id::text||target_party_id::text,0));

  select md5(coalesce(string_agg(s.signature,'|' order by s.signature),'')) into fingerprint from (
    select 'o:'||o.id||':'||o.status||':'||o.order_date||':'||coalesce(o.completed_at::text,'')||':'||o.currency||':'||o.grand_total signature from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.archived_at is null
    union all select 'i:'||i.id||':'||i.status||':'||i.issue_date||':'||coalesce(i.due_date::text,'')||':'||coalesce(i.paid_at::text,'')||':'||i.currency||':'||i.outstanding_amount from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.archived_at is null
    union all select 'p:'||p.id||':'||p.payment_date||':'||p.currency||':'||p.amount from public.finance_payments p where p.company_id=target_company_id and p.party_id=target_party_id and p.direction='inflow'
    union all select 'q:'||q.id||':'||q.status||':'||q.issue_date||':'||coalesce(q.valid_until::text,'')||':'||q.currency||':'||coalesce(v.grand_total,0) from public.sales_quotes q left join public.sales_quote_versions v on v.id=q.current_version_id and v.company_id=q.company_id where q.company_id=target_company_id and q.party_id=target_party_id and q.archived_at is null
    union all select 'a:'||a.id||':'||a.activity_type||':'||a.activity_at||':'||coalesce(a.completed_at::text,'') from public.sales_activities a where a.company_id=target_company_id and a.party_id=target_party_id and a.visibility='company' and a.archived_at is null
  ) s;
  select * into existing from public.customer_health_assessments a where a.company_id=target_company_id and a.party_id=target_party_id and a.is_current for update;
  if found and existing.evaluated_on=eval_date and existing.ruleset_version=ruleset and existing.source_fingerprint=fingerprint then
    return query select existing.id,existing.health_status,existing.data_sufficiency,existing.confidence,false; return;
  end if;

  if exists(select 1 from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.status='completed' and o.archived_at is null and o.completed_at::date between eval_date-365 and eval_date) then domains:=domains+1; end if;
  if exists(select 1 from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.status in('issued','partially_paid','paid') and i.archived_at is null) then domains:=domains+1; end if;
  if exists(select 1 from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.status in('sent','viewed','revision_requested','accepted','rejected','expired') and q.archived_at is null) then domains:=domains+1; end if;
  if exists(select 1 from public.sales_activities a where a.company_id=target_company_id and a.party_id=target_party_id and a.visibility='company' and a.archived_at is null) then domains:=domains+1; end if;
  suff:=case when domains>=2 and (exists(select 1 from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.status='completed' and o.archived_at is null) or exists(select 1 from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.status in('issued','partially_paid','paid') and i.archived_at is null)) then 'sufficient' when domains=0 then 'insufficient' else 'partial' end;

  if existing.id is not null then update public.customer_health_assessments set is_current=false,superseded_at=now() where id=existing.id; end if;
  insert into public.customer_health_assessments(company_id,party_id,health_status,data_sufficiency,confidence,summary,evaluated_on,window_start,window_end,ruleset_version,source_fingerprint,created_by)
  values(target_company_id,target_party_id,'insufficient_data',suff,'low','Değerlendirme hazırlanıyor.',eval_date,eval_date-365,eval_date,ruleset,fingerprint,actor_id) returning id into new_id;

  insert into public.customer_health_currency_contexts(company_id,party_id,assessment_id,currency,completed_order_count_12m,completed_order_value_12m,recent_order_count_90d,recent_order_value_90d,previous_order_count_90d,previous_order_value_90d,open_receivable,overdue_receivable,recent_quote_count_180d,recent_quote_value_180d,accepted_quote_count_180d,rejected_quote_count_180d,expired_quote_count_180d)
  select target_company_id,target_party_id,new_id,c.currency,
    count(o.id) filter(where o.completed_at::date between eval_date-365 and eval_date),coalesce(sum(o.grand_total) filter(where o.completed_at::date between eval_date-365 and eval_date),0),
    count(o.id) filter(where o.completed_at::date between eval_date-89 and eval_date),coalesce(sum(o.grand_total) filter(where o.completed_at::date between eval_date-89 and eval_date),0),
    count(o.id) filter(where o.completed_at::date between eval_date-179 and eval_date-90),coalesce(sum(o.grand_total) filter(where o.completed_at::date between eval_date-179 and eval_date-90),0),
    coalesce((select sum(i.outstanding_amount) from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.currency=c.currency and i.status in('issued','partially_paid') and i.archived_at is null and i.outstanding_amount>0),0),
    coalesce((select sum(i.outstanding_amount) from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.currency=c.currency and i.status in('issued','partially_paid') and i.archived_at is null and i.outstanding_amount>0 and i.due_date<eval_date),0),
    (select count(*) from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=c.currency and q.archived_at is null and q.issue_date between eval_date-179 and eval_date),
    coalesce((select sum(v.grand_total) from public.sales_quotes q join public.sales_quote_versions v on v.id=q.current_version_id where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=c.currency and q.archived_at is null and q.issue_date between eval_date-179 and eval_date),0),
    (select count(*) from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=c.currency and q.status='accepted' and q.archived_at is null and q.issue_date between eval_date-179 and eval_date),
    (select count(*) from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=c.currency and q.status='rejected' and q.archived_at is null and q.issue_date between eval_date-179 and eval_date),
    (select count(*) from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=c.currency and q.status='expired' and q.archived_at is null and q.issue_date between eval_date-179 and eval_date)
  from (select currency from public.sales_orders where company_id=target_company_id and party_id=target_party_id and archived_at is null union select currency from public.finance_invoices where company_id=target_company_id and party_id=target_party_id and archived_at is null union select currency from public.sales_quotes where company_id=target_company_id and party_id=target_party_id and archived_at is null) c
  left join public.sales_orders o on o.company_id=target_company_id and o.party_id=target_party_id and o.currency=c.currency and o.status='completed' and o.archived_at is null group by c.currency;

  -- Overdue receivable, currency-safe.
  for cur in select currency,sum(outstanding_amount) open_amount,sum(outstanding_amount) filter(where due_date<eval_date) overdue_amount,max(eval_date-due_date) filter(where due_date<eval_date) max_days,count(*) filter(where due_date<eval_date) affected from public.finance_invoices where company_id=target_company_id and party_id=target_party_id and status in('issued','partially_paid') and outstanding_amount>0 and archived_at is null group by currency loop
    if cur.affected>0 and (cur.max_days>60 or cur.overdue_amount>=cur.open_amount*.5) then
      insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_end,currency,metric_value,baseline_value,threshold_value,amount,evidence_count) values(target_company_id,target_party_id,new_id,'overdue_receivable','finance','negative','critical','Kritik gecikmiş alacak','Vadesi 60 günü aşan veya açık alacağın en az yarısını oluşturan gecikmiş alacak var.','Ödeme durumunu doğrulayın ve teyit edilen tahsilatı kaydedin.',eval_date,cur.currency,cur.overdue_amount/cur.open_amount*100,cur.open_amount,50,cur.overdue_amount,cur.affected) returning id into factor_id; criticals:=criticals+1;
    elsif cur.affected>0 and (cur.max_days>=1 or cur.overdue_amount>=cur.open_amount*.2) then
      insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_end,currency,metric_value,baseline_value,threshold_value,amount,evidence_count) values(target_company_id,target_party_id,new_id,'overdue_receivable','finance','negative','warning','Gecikmiş alacak','Vadesi geçen veya açık alacağın en az beşte birini oluşturan gecikmiş alacak var.','Ödeme durumunu doğrulayın ve teyit edilen tahsilatı kaydedin.',eval_date,cur.currency,cur.overdue_amount/cur.open_amount*100,cur.open_amount,20,cur.overdue_amount,cur.affected) returning id into factor_id; warnings:=warnings+1;warning_finance:=true;
    else continue; end if;
    insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'finance_invoice',i.id,i.due_date::timestamptz,'Vadesi geçmiş açık fatura',i.outstanding_amount,i.currency from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.currency=cur.currency and i.status in('issued','partially_paid') and i.outstanding_amount>0 and i.archived_at is null and i.due_date<eval_date;
  end loop;

  -- Late-payment pattern and reliable payment evidence.
  select count(*),count(*) filter(where paid_at::date>due_date),coalesce(avg((paid_at::date-due_date)) filter(where paid_at::date>due_date),0),coalesce(count(*) filter(where paid_at::date<=due_date)::numeric/nullif(count(*),0),0) into eligible,late_count,avg_delay,ontime_ratio from public.finance_invoices where company_id=target_company_id and party_id=target_party_id and status='paid' and archived_at is null and due_date is not null and paid_at is not null and paid_at::date between eval_date-179 and eval_date;
  if eligible>=2 and late_count>=3 and avg_delay>=15 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'late_payment_pattern','finance','negative','critical','Tekrarlayan geç ödeme','Son 180 günde en az üç fatura ortalama 15 gün veya daha fazla gecikmeyle tahsil edildi.','Ödeme koşullarını ve tahsilat takibini gözden geçirin.',eval_date-179,eval_date,late_count,eligible,15,eligible) returning id into factor_id;criticals:=criticals+1;
  elsif eligible>=2 and late_count>=2 and late_count::numeric/eligible>=.5 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'late_payment_pattern','finance','negative','warning','Geç ödeme örüntüsü','Son 180 gündeki uygun faturaların en az yarısı geç tahsil edildi.','Ödeme koşullarını ve tahsilat takibini gözden geçirin.',eval_date-179,eval_date,late_count,eligible,50,eligible) returning id into factor_id;warnings:=warnings+1;warning_finance:=true;
  elsif eligible>=3 and ontime_ratio>=.8 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,period_start,period_end,metric_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'reliable_payment_pattern','finance','positive','info','Düzenli ödeme örüntüsü','Son 180 gündeki uygun faturaların en az yüzde 80’i vadesinde tahsil edildi.',eval_date-179,eval_date,ontime_ratio*100,80,eligible);positives:=positives+1; end if;
  if factor_id is not null and eligible>=2 then insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'finance_invoice',i.id,i.paid_at,'Vadesi ve tahsil tarihi bulunan fatura',i.grand_total,i.currency from public.finance_invoices i where i.company_id=target_company_id and i.party_id=target_party_id and i.status='paid' and i.archived_at is null and i.due_date is not null and i.paid_at is not null and i.paid_at::date between eval_date-179 and eval_date on conflict do nothing; end if; factor_id:=null;

  -- Order inactivity and positive recency.
  select count(*),max(completed_at::date) into order_count,last_order from public.sales_orders where company_id=target_company_id and party_id=target_party_id and status='completed' and archived_at is null and completed_at::date between eval_date-365 and eval_date;
  if order_count>=3 then select percentile_cont(.5) within group(order by gap) into median_interval from (select d-lag(d) over(order by d) gap from (select completed_at::date d from public.sales_orders where company_id=target_company_id and party_id=target_party_id and status='completed' and archived_at is null and completed_at::date<=eval_date order by completed_at desc limit 6) z) x where gap is not null; current_gap:=eval_date-last_order;
    if current_gap>=75 and current_gap>=2*median_interval then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,observed_at,period_start,period_end,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'order_inactivity','sales','negative','critical','Kritik sipariş hareketsizliği','Son tamamlanan sipariş, tarihsel ortanca aralığın en az iki katı kadar önce gerçekleşti.','Müşteri takibi planlayın ve açık fırsatları gözden geçirin.',last_order::timestamptz,eval_date-365,eval_date,current_gap,median_interval,greatest(75,2*median_interval),order_count) returning id into factor_id;criticals:=criticals+1;
    elsif current_gap>=45 and current_gap>=1.5*median_interval then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,observed_at,period_start,period_end,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'order_inactivity','sales','negative','warning','Sipariş hareketsizliği','Son tamamlanan sipariş, tarihsel ortanca aralığın en az bir buçuk katı kadar önce gerçekleşti.','Müşteri takibi planlayın ve açık fırsatları gözden geçirin.',last_order::timestamptz,eval_date-365,eval_date,current_gap,median_interval,greatest(45,1.5*median_interval),order_count) returning id into factor_id;warnings:=warnings+1;warning_sales:=true; end if;
  end if;
  if factor_id is not null then insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'sales_order',o.id,o.completed_at,'Tamamlanan satış siparişi',o.grand_total,o.currency from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.status='completed' and o.archived_at is null and o.completed_at::date between eval_date-365 and eval_date order by o.completed_at desc limit 6; end if; factor_id:=null;
  if last_order>=eval_date-29 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,observed_at,evidence_count) values(target_company_id,target_party_id,new_id,'recent_completed_order','sales','positive','info','Yakın tarihli tamamlanan sipariş','Son 30 gün içinde tamamlanan sipariş bulunuyor.',last_order::timestamptz,1) returning id into factor_id;positives:=positives+1; insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'sales_order',o.id,o.completed_at,'Yakın tarihli tamamlanan sipariş',o.grand_total,o.currency from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.status='completed' and o.archived_at is null order by o.completed_at desc limit 1; end if; factor_id:=null;

  -- Order value decline, separated by currency.
  for cur in select currency,count(*) filter(where completed_at::date between eval_date-89 and eval_date) recent_count,coalesce(sum(grand_total) filter(where completed_at::date between eval_date-89 and eval_date),0) recent_value,count(*) filter(where completed_at::date between eval_date-179 and eval_date-90) previous_count,coalesce(sum(grand_total) filter(where completed_at::date between eval_date-179 and eval_date-90),0) previous_value from public.sales_orders where company_id=target_company_id and party_id=target_party_id and status='completed' and archived_at is null group by currency loop
    if cur.recent_count>=2 and cur.previous_count>=2 and cur.previous_value>0 then decline:=(cur.previous_value-cur.recent_value)/cur.previous_value*100;
      if decline>=50 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,currency,metric_value,baseline_value,threshold_value,delta_pct,amount,evidence_count) values(target_company_id,target_party_id,new_id,'order_value_decline','sales','negative','critical','Kritik sipariş değeri düşüşü','Son 90 günlük tamamlanan sipariş değeri önceki 90 güne göre en az yüzde 50 azaldı.','Son sipariş örüntüsünü ve açık fırsatları gözden geçirin.',eval_date-179,eval_date,cur.currency,cur.recent_value,cur.previous_value,50,-decline,cur.recent_value,cur.recent_count+cur.previous_count) returning id into factor_id;criticals:=criticals+1;
      elsif decline>=30 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,currency,metric_value,baseline_value,threshold_value,delta_pct,amount,evidence_count) values(target_company_id,target_party_id,new_id,'order_value_decline','sales','negative','warning','Sipariş değeri düşüşü','Son 90 günlük tamamlanan sipariş değeri önceki 90 güne göre en az yüzde 30 azaldı.','Son sipariş örüntüsünü ve açık fırsatları gözden geçirin.',eval_date-179,eval_date,cur.currency,cur.recent_value,cur.previous_value,30,-decline,cur.recent_value,cur.recent_count+cur.previous_count) returning id into factor_id;warnings:=warnings+1;warning_sales:=true; end if;
      if factor_id is not null then insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'sales_order',o.id,o.completed_at,'Karşılaştırma dönemindeki tamamlanan sipariş',o.grand_total,o.currency from public.sales_orders o where o.company_id=target_company_id and o.party_id=target_party_id and o.currency=cur.currency and o.status='completed' and o.archived_at is null and o.completed_at::date between eval_date-179 and eval_date; end if; factor_id:=null;
    end if;
  end loop;

  -- Quotation outcomes, separated by currency.
  for cur in select currency,count(*) terminal_count,count(*) filter(where status='accepted') accepted_count,count(*) filter(where status='rejected') rejected_count,count(*) filter(where status='expired') expired_count from public.sales_quotes where company_id=target_company_id and party_id=target_party_id and status in('accepted','rejected','expired') and archived_at is null and issue_date between eval_date-179 and eval_date group by currency loop
    terminal_count:=cur.terminal_count;accepted_count:=cur.accepted_count;rejected_count:=cur.rejected_count;expired_count:=cur.expired_count;acceptance_ratio:=accepted_count::numeric/terminal_count;
    if terminal_count>=4 and accepted_count=0 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,currency,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'quote_outcome_deterioration','sales','negative','critical','Kritik teklif sonucu bozulması','Son 180 gündeki en az dört sonuçlanmış teklifin hiçbiri kabul edilmedi.','Sonraki tekliften önce ret ve süre dolma nedenlerini gözden geçirin.',eval_date-179,eval_date,cur.currency,0,terminal_count,25,terminal_count) returning id into factor_id;criticals:=criticals+1;
    elsif terminal_count>=3 and (acceptance_ratio<.25 or rejected_count+expired_count>=3) then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,period_start,period_end,currency,metric_value,baseline_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'quote_outcome_deterioration','sales','negative','warning','Teklif sonucu bozulması','Son 180 gündeki teklif kabul oranı yüzde 25’in altında veya en az üç teklif reddedildi ya da süresi doldu.','Sonraki tekliften önce ret ve süre dolma nedenlerini gözden geçirin.',eval_date-179,eval_date,cur.currency,acceptance_ratio*100,terminal_count,25,terminal_count) returning id into factor_id;warnings:=warnings+1;warning_sales:=true; end if;
    if factor_id is not null then insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label,amount,currency) select target_company_id,target_party_id,new_id,factor_id,'sales_quote',q.id,q.issue_date::timestamptz,'Sonuçlanmış teklif',v.grand_total,q.currency from public.sales_quotes q join public.sales_quote_versions v on v.id=q.current_version_id where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=cur.currency and q.status in('accepted','rejected','expired') and q.archived_at is null and q.issue_date between eval_date-179 and eval_date; end if; factor_id:=null;
    if accepted_count>0 and exists(select 1 from public.sales_quotes q where q.company_id=target_company_id and q.party_id=target_party_id and q.currency=cur.currency and q.status='accepted' and q.archived_at is null and q.accepted_at::date between eval_date-89 and eval_date) then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,period_start,period_end,currency,evidence_count) values(target_company_id,target_party_id,new_id,'recent_accepted_quote','sales','positive','info','Yakın tarihli kabul edilen teklif','Son 90 gün içinde kabul edilen teklif bulunuyor.',eval_date-89,eval_date,cur.currency,accepted_count);positives:=positives+1; end if;
  end loop;

  -- Relationship activity metadata only; private and sales-team records excluded.
  select max(activity_at::date) into last_activity from public.sales_activities where company_id=target_company_id and party_id=target_party_id and visibility='company' and archived_at is null and activity_at::date<=eval_date;
  if last_activity is not null then activity_gap:=eval_date-last_activity;
    if activity_gap>=90 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,observed_at,metric_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'relationship_inactivity','relationship','negative','critical','Kritik ilişki hareketsizliği','Son şirket görünür satış aktivitesinin üzerinden en az 90 gün geçti.','Müşteri takibi planlayın.',last_activity::timestamptz,activity_gap,90,1) returning id into factor_id;criticals:=criticals+1;
    elsif activity_gap>=60 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,recommendation,observed_at,metric_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'relationship_inactivity','relationship','negative','warning','İlişki hareketsizliği','Son şirket görünür satış aktivitesinin üzerinden 60–89 gün geçti.','Müşteri takibi planlayın.',last_activity::timestamptz,activity_gap,60,1) returning id into factor_id;warnings:=warnings+1;
    elsif activity_gap<=29 then insert into public.customer_health_factors(company_id,party_id,assessment_id,factor_code,source_domain,direction,severity,title,explanation,observed_at,metric_value,threshold_value,evidence_count) values(target_company_id,target_party_id,new_id,'recent_customer_activity','relationship','positive','info','Yakın tarihli müşteri aktivitesi','Son 30 gün içinde şirket görünür satış aktivitesi kaydedildi.',last_activity::timestamptz,activity_gap,30,1) returning id into factor_id;positives:=positives+1; end if;
    if factor_id is not null then insert into public.customer_health_evidence(company_id,party_id,assessment_id,factor_id,source_type,source_id,observed_at,label) select target_company_id,target_party_id,new_id,factor_id,'sales_activity',a.id,a.activity_at,'Şirket görünür satış aktivitesi' from public.sales_activities a where a.company_id=target_company_id and a.party_id=target_party_id and a.visibility='company' and a.archived_at is null order by a.activity_at desc limit 1; end if;
  end if;

  select count(*) filter(where f.severity='warning' and f.direction='negative'),count(*) filter(where f.severity='critical' and f.direction='negative'),bool_or(f.source_domain='sales' and f.severity='warning'),bool_or(f.source_domain='finance' and f.severity='warning'),count(*) filter(where f.direction='positive'),(array_agg(f.factor_code order by case f.severity when 'critical' then 1 when 'warning' then 2 else 3 end,f.created_at))[1] into warnings,criticals,warning_sales,warning_finance,positives,primary_code from public.customer_health_factors f where f.assessment_id=new_id;
  warnings:=coalesce(warnings,0);criticals:=coalesce(criticals,0);positives:=coalesce(positives,0);
  result_status:=case when criticals>0 or (warnings>=3 and coalesce(warning_sales,false) and coalesce(warning_finance,false)) then 'critical' when warnings>=2 then 'risky' when warnings=1 then 'watch' when suff='sufficient' and positives>0 then 'healthy' else 'insufficient_data' end;
  conf:=case when domains>=2 and exists(select 1 from public.customer_health_evidence e where e.assessment_id=new_id) then 'high' when domains>=1 then 'medium' else 'low' end;
  update public.customer_health_assessments set health_status=result_status,data_sufficiency=suff,confidence=conf,primary_risk_code=case when warnings+criticals>0 then primary_code else null end,
    summary=case result_status when 'critical' then 'Kritik: Yapılandırılmış kayıtlarda acil inceleme gerektiren müşteri riski bulundu.' when 'risky' then 'Riskli: Birden fazla doğrulanabilir risk faktörü birlikte izlenmelidir.' when 'watch' then 'İzlenmeli: Bir doğrulanabilir risk faktörü takip gerektiriyor.' when 'healthy' then 'Sağlıklı: Yeterli veride uyarı bulunmadı ve yakın tarihli olumlu kanıt var.' else 'Yetersiz veri: Güvenilir bir sağlık sonucu için ticari geçmiş sınırlı.' end where id=new_id;
  return query select new_id,result_status,suff,conf,true;
end $$;

create or replace function public.refresh_company_customer_health(target_company_id uuid,target_party_ids uuid[] default null,evaluation_date date default current_date,party_limit integer default 100)
returns table(evaluated_count integer,created_count integer,unchanged_count integer,failed_count integer,errors jsonb)
language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=auth.uid(); p record; r record; evaluated integer:=0; created integer:=0; unchanged integer:=0; failed integer:=0; safe_errors jsonb:='[]'::jsonb; capped integer:=least(coalesce(party_limit,100),200);
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Customer health refresh requires company operator access' using errcode='42501'; end if;
  if capped<1 then raise exception 'Limit must be positive' using errcode='22023'; end if;
  for p in select bp.id from public.business_parties bp where bp.company_id=target_company_id and bp.archived_at is null and bp.relationship_status='active' and (target_party_ids is null or bp.id=any(target_party_ids)) and (exists(select 1 from public.business_party_roles br where br.party_id=bp.id and br.role='customer') or exists(select 1 from public.sales_orders so where so.company_id=target_company_id and so.party_id=bp.id and so.status='completed' and so.archived_at is null) or exists(select 1 from public.finance_invoices fi where fi.company_id=target_company_id and fi.party_id=bp.id and fi.archived_at is null)) order by bp.id limit capped
  loop
    evaluated:=evaluated+1;
    begin select * into r from public.refresh_customer_health_assessment(target_company_id,p.id,evaluation_date); if r.created_new then created:=created+1; else unchanged:=unchanged+1; end if;
    exception when others then failed:=failed+1;safe_errors:=safe_errors||jsonb_build_array(jsonb_build_object('party_id',p.id,'code',sqlstate)); end;
  end loop;
  return query select evaluated,created,unchanged,failed,safe_errors;
end $$;

revoke all on function public.refresh_customer_health_assessment(uuid,uuid,date) from public,anon;
revoke all on function public.refresh_company_customer_health(uuid,uuid[],date,integer) from public,anon;
grant execute on function public.refresh_customer_health_assessment(uuid,uuid,date) to authenticated;
grant execute on function public.refresh_company_customer_health(uuid,uuid[],date,integer) to authenticated;
