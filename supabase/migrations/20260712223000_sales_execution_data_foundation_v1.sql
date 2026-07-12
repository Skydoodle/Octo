-- Octo Sales Execution Data Foundation V1

create table public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_type text not null default 'organization' check (lead_type in ('organization','individual')),
  company_name text, first_name text, last_name text,
  email text check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text, source text, product_interest text,
  assigned_to uuid references auth.users(id),
  status text not null default 'new' check (status in ('new','to_contact','contacted','qualifying','qualified','disqualified','converted')),
  estimated_value numeric(18,2) check (estimated_value is null or estimated_value >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','GBP')),
  qualification_notes text, next_action text, next_action_at timestamptz, disqualification_reason text,
  converted_party_id uuid,
  converted_contact_id uuid,
  converted_opportunity_id uuid,
  converted_at timestamptz, archived_at timestamptz,
  created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, company_id),
  check (nullif(btrim(company_name),'') is not null or nullif(btrim(first_name),'') is not null),
  check ((status = 'disqualified' and nullif(btrim(disqualification_reason),'') is not null) or status <> 'disqualified'),
  check ((status = 'converted') = (converted_at is not null and converted_party_id is not null and converted_opportunity_id is not null)),
  check (status = 'converted' or (converted_party_id is null and converted_contact_id is null and converted_opportunity_id is null and converted_at is null))
);
create index sales_leads_company_idx on public.sales_leads(company_id);
create index sales_leads_status_idx on public.sales_leads(company_id,status);
create index sales_leads_assigned_idx on public.sales_leads(company_id,assigned_to);
create index sales_leads_next_action_idx on public.sales_leads(next_action_at);
create index sales_leads_archived_idx on public.sales_leads(archived_at);
create index sales_leads_email_idx on public.sales_leads(lower(email));
create index sales_leads_updated_idx on public.sales_leads(company_id,updated_at desc);

alter table public.business_contacts add constraint business_contacts_id_company_unique unique(id,company_id);
alter table public.sales_leads add constraint sales_leads_converted_party_company_fk foreign key(converted_party_id,company_id) references public.business_parties(id,company_id);
alter table public.sales_leads add constraint sales_leads_converted_contact_company_fk foreign key(converted_contact_id,company_id) references public.business_contacts(id,company_id);

create table public.sales_pipelines (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0), is_default boolean not null default false,
  is_active boolean not null default true, archived_at timestamptz,
  created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,company_id)
);
create unique index sales_pipelines_one_default on public.sales_pipelines(company_id) where is_default and is_active and archived_at is null;
create index sales_pipelines_company_idx on public.sales_pipelines(company_id);

create table public.sales_pipeline_stages (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  pipeline_id uuid not null, name text not null check (char_length(btrim(name)) > 0), stage_key text not null,
  position integer not null check(position > 0), default_probability integer not null check(default_probability between 0 and 100),
  stale_after_days integer check(stale_after_days is null or stale_after_days > 0), is_closed boolean not null default false,
  outcome text check(outcome is null or outcome in ('won','lost')),
  required_fields jsonb not null default '[]'::jsonb check(jsonb_typeof(required_fields)='array'),
  recommended_actions jsonb not null default '[]'::jsonb check(jsonb_typeof(recommended_actions)='array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,company_id), unique(pipeline_id,position), unique(pipeline_id,stage_key),
  constraint sales_stages_pipeline_company_fk foreign key(pipeline_id,company_id) references public.sales_pipelines(id,company_id) on delete cascade,
  check ((outcome is null and not is_closed) or (outcome is not null and is_closed)),
  check (outcome <> 'won' or default_probability=100), check (outcome <> 'lost' or default_probability=0)
);
create index sales_stages_company_idx on public.sales_pipeline_stages(company_id);
create index sales_stages_pipeline_idx on public.sales_pipeline_stages(pipeline_id,position);

create table public.sales_opportunities (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  party_id uuid not null, pipeline_id uuid not null, stage_id uuid not null,
  owner_user_id uuid not null references auth.users(id), title text not null check(char_length(btrim(title))>0),
  expected_value numeric(18,2) not null default 0 check(expected_value>=0), currency text not null default 'TRY' check(currency in ('TRY','EUR','USD','GBP')),
  expected_close_date date, product_interest text, next_action text, next_action_at timestamptz,
  probability integer check(probability is null or probability between 0 and 100),
  forecast_category text not null default 'potential' check(forecast_category in ('committed','expected','potential','excluded')),
  expected_margin_pct numeric(7,3) check(expected_margin_pct is null or expected_margin_pct between -1000 and 1000),
  source text, priority text not null default 'normal' check(priority in ('low','normal','high','critical')),
  customer_need text, decision_process text, competitors text, loss_reason text,
  won_at timestamptz, lost_at timestamptz, archived_at timestamptz,
  created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,company_id),
  constraint sales_opportunities_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  constraint sales_opportunities_pipeline_company_fk foreign key(pipeline_id,company_id) references public.sales_pipelines(id,company_id),
  constraint sales_opportunities_stage_company_fk foreign key(stage_id,company_id) references public.sales_pipeline_stages(id,company_id)
);
create index sales_opportunities_company_idx on public.sales_opportunities(company_id);
create index sales_opportunities_party_idx on public.sales_opportunities(company_id,party_id);
create index sales_opportunities_stage_idx on public.sales_opportunities(company_id,stage_id);
create index sales_opportunities_owner_idx on public.sales_opportunities(company_id,owner_user_id);
create index sales_opportunities_close_idx on public.sales_opportunities(expected_close_date);
create index sales_opportunities_archived_idx on public.sales_opportunities(archived_at);
alter table public.sales_leads add constraint sales_leads_converted_opportunity_fk foreign key(converted_opportunity_id) references public.sales_opportunities(id);
alter table public.sales_leads add constraint sales_leads_converted_opportunity_company_fk foreign key(converted_opportunity_id,company_id) references public.sales_opportunities(id,company_id);

create table public.sales_opportunity_contacts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null, contact_id uuid not null, relationship_role text, is_primary boolean not null default false,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(opportunity_id,contact_id),
  constraint sales_opp_contacts_opportunity_company_fk foreign key(opportunity_id,company_id) references public.sales_opportunities(id,company_id) on delete cascade,
  constraint sales_opp_contacts_contact_company_fk foreign key(contact_id,company_id) references public.business_contacts(id,company_id)
);
create unique index sales_opp_contacts_one_primary on public.sales_opportunity_contacts(opportunity_id) where is_primary;
create index sales_opp_contacts_company_idx on public.sales_opportunity_contacts(company_id);

create table public.sales_activities (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  activity_type text not null check(activity_type in ('call','meeting','email','message','note','task','quote_sent','file_shared','stage_changed','sales_order_event','invoice_event','payment_event')),
  lead_id uuid, party_id uuid, contact_id uuid, opportunity_id uuid,
  owner_user_id uuid not null references auth.users(id), assigned_to uuid references auth.users(id),
  title text, description text, outcome text, activity_at timestamptz not null default now(), due_at timestamptz,
  completed_at timestamptz, next_action text, next_action_at timestamptz,
  visibility text not null default 'sales_team' check(visibility in ('company','sales_team','private')),
  archived_at timestamptz, created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,company_id),
  check(lead_id is not null or party_id is not null or opportunity_id is not null),
  check(completed_at is null or completed_at >= created_at),
  constraint sales_activities_lead_company_fk foreign key(lead_id,company_id) references public.sales_leads(id,company_id),
  constraint sales_activities_party_company_fk foreign key(party_id,company_id) references public.business_parties(id,company_id),
  constraint sales_activities_contact_company_fk foreign key(contact_id,company_id) references public.business_contacts(id,company_id),
  constraint sales_activities_opportunity_company_fk foreign key(opportunity_id,company_id) references public.sales_opportunities(id,company_id)
);
create index sales_activities_company_idx on public.sales_activities(company_id);
create index sales_activities_lead_idx on public.sales_activities(company_id,lead_id);
create index sales_activities_opportunity_idx on public.sales_activities(company_id,opportunity_id);
create index sales_activities_due_idx on public.sales_activities(due_at);
create index sales_activities_archived_idx on public.sales_activities(archived_at);

create table public.sales_opportunity_stage_history (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null, from_stage_id uuid, to_stage_id uuid not null,
  changed_by uuid not null references auth.users(id), changed_at timestamptz not null default now(), reason text,
  days_in_previous_stage numeric(12,3),
  constraint sales_history_opportunity_company_fk foreign key(opportunity_id,company_id) references public.sales_opportunities(id,company_id) on delete cascade,
  constraint sales_history_from_stage_company_fk foreign key(from_stage_id,company_id) references public.sales_pipeline_stages(id,company_id),
  constraint sales_history_to_stage_company_fk foreign key(to_stage_id,company_id) references public.sales_pipeline_stages(id,company_id)
);
create index sales_history_opportunity_idx on public.sales_opportunity_stage_history(opportunity_id,changed_at desc);

create or replace function public.sales_active_member(target_company_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.company_memberships m where m.company_id=target_company_id and m.user_id=target_user_id and m.status='active') $$;
revoke all on function public.sales_active_member(uuid,uuid) from public,anon;
grant execute on function public.sales_active_member(uuid,uuid) to authenticated;

create or replace function public.normalize_sales_lead() returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid();
begin
  if actor_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed' using errcode='22023'; end if;
    if old.status='converted' and new is distinct from old then raise exception 'Converted lead is immutable' using errcode='23514'; end if;
    new.created_by:=old.created_by; new.created_at:=old.created_at;
  else new.created_by:=actor_id; new.created_at:=now(); end if;
  new.updated_by:=actor_id; new.updated_at:=now();
  new.company_name:=nullif(btrim(new.company_name),''); new.first_name:=nullif(btrim(new.first_name),''); new.last_name:=nullif(btrim(new.last_name),'');
  new.email:=nullif(lower(btrim(new.email)),''); new.phone:=nullif(btrim(new.phone),''); new.source:=nullif(btrim(new.source),'');
  new.product_interest:=nullif(btrim(new.product_interest),''); new.qualification_notes:=nullif(btrim(new.qualification_notes),'');
  new.next_action:=nullif(btrim(new.next_action),''); new.disqualification_reason:=nullif(btrim(new.disqualification_reason),''); new.currency:=upper(btrim(new.currency));
  if new.assigned_to is not null and not public.sales_active_member(new.company_id,new.assigned_to) then raise exception 'Assignee must be an active company member' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.normalize_sales_pipeline() returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=coalesce(auth.uid(),new.created_by); begin
  if actor_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if tg_op='UPDATE' then if new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed' using errcode='22023'; end if; new.created_by:=old.created_by; new.created_at:=old.created_at; else new.created_by:=actor_id; end if;
  new.updated_by:=actor_id; new.name:=btrim(new.name); new.updated_at:=now(); return new;
end $$;

create or replace function public.normalize_sales_stage() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.company_id is distinct from old.company_id or new.pipeline_id is distinct from old.pipeline_id) then raise exception 'Stage company and pipeline cannot be changed' using errcode='22023'; end if;
 new.name:=btrim(new.name); new.stage_key:=lower(btrim(new.stage_key)); new.updated_at:=now(); return new;
end $$;

create or replace function public.normalize_sales_opportunity_contact() returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid(); begin
 if actor_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
 if tg_op='UPDATE' and new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed' using errcode='22023'; end if;
 new.created_by:=case when tg_op='UPDATE' then old.created_by else actor_id end; new.relationship_role:=nullif(btrim(new.relationship_role),''); return new;
end $$;

create or replace function public.normalize_sales_opportunity() returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid(); stage_row public.sales_pipeline_stages%rowtype; old_default integer;
begin
  if actor_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed' using errcode='22023'; end if;
    new.created_by:=old.created_by; new.created_at:=old.created_at;
  else new.created_by:=actor_id; new.created_at:=now(); end if;
  new.updated_by:=actor_id; new.updated_at:=now(); new.title:=btrim(new.title); new.currency:=upper(btrim(new.currency));
  new.product_interest:=nullif(btrim(new.product_interest),''); new.next_action:=nullif(btrim(new.next_action),''); new.source:=nullif(btrim(new.source),'');
  new.customer_need:=nullif(btrim(new.customer_need),''); new.decision_process:=nullif(btrim(new.decision_process),''); new.competitors:=nullif(btrim(new.competitors),''); new.loss_reason:=nullif(btrim(new.loss_reason),'');
  select * into stage_row from public.sales_pipeline_stages s where s.id=new.stage_id and s.company_id=new.company_id and s.pipeline_id=new.pipeline_id;
  if not found then raise exception 'Stage must belong to the selected company and pipeline' using errcode='23514'; end if;
  if not public.sales_active_member(new.company_id,new.owner_user_id) then raise exception 'Owner must be an active company member' using errcode='23514'; end if;
  if tg_op='INSERT' or new.probability is null then new.probability:=stage_row.default_probability;
  elsif new.stage_id is distinct from old.stage_id then select s.default_probability into old_default from public.sales_pipeline_stages s where s.id=old.stage_id; if old.probability=old_default then new.probability:=stage_row.default_probability; end if; end if;
  if stage_row.outcome='lost' then if new.loss_reason is null then raise exception 'Loss reason is required' using errcode='23514'; end if; new.lost_at:=coalesce(new.lost_at,now()); new.won_at:=null;
  elsif stage_row.outcome='won' then new.won_at:=coalesce(new.won_at,now()); new.lost_at:=null; new.loss_reason:=null;
  else new.won_at:=null; new.lost_at:=null; new.loss_reason:=null; end if;
  return new;
end $$;

create or replace function public.normalize_sales_activity() returns trigger language plpgsql set search_path='' as $$
declare actor_id uuid:=auth.uid(); contact_party uuid;
begin
  if actor_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if tg_op='UPDATE' then if new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed' using errcode='22023'; end if; new.created_by:=old.created_by; new.created_at:=old.created_at; else new.created_by:=actor_id; new.created_at:=now(); end if;
  new.updated_by:=actor_id; new.updated_at:=now(); new.title:=nullif(btrim(new.title),''); new.description:=nullif(btrim(new.description),''); new.outcome:=nullif(btrim(new.outcome),''); new.next_action:=nullif(btrim(new.next_action),'');
  if not public.sales_active_member(new.company_id,new.owner_user_id) or (new.assigned_to is not null and not public.sales_active_member(new.company_id,new.assigned_to)) then raise exception 'Owner and assignee must be active company members' using errcode='23514'; end if;
  if new.contact_id is not null and new.party_id is not null then select c.party_id into contact_party from public.business_contacts c where c.id=new.contact_id and c.company_id=new.company_id; if contact_party is distinct from new.party_id then raise exception 'Contact must belong to selected party' using errcode='23514'; end if; end if;
  return new;
end $$;

create or replace function public.record_sales_stage_history() returns trigger language plpgsql security definer set search_path='' as $$
declare prior_change timestamptz; transition_reason text:=nullif(current_setting('octo.stage_reason',true),'');
begin
  if new.stage_id is not distinct from old.stage_id then return new; end if;
  select max(h.changed_at) into prior_change from public.sales_opportunity_stage_history h where h.opportunity_id=new.id;
  insert into public.sales_opportunity_stage_history(company_id,opportunity_id,from_stage_id,to_stage_id,changed_by,reason,days_in_previous_stage)
  values(new.company_id,new.id,old.stage_id,new.stage_id,auth.uid(),transition_reason,extract(epoch from (now()-coalesce(prior_change,old.created_at)))/86400.0);
  return new;
end $$;

create trigger sales_leads_normalize before insert or update on public.sales_leads for each row execute function public.normalize_sales_lead();
create trigger sales_pipelines_normalize before insert or update on public.sales_pipelines for each row execute function public.normalize_sales_pipeline();
create trigger sales_pipelines_updated before update on public.sales_pipelines for each row execute function public.set_updated_at();
create trigger sales_stages_normalize before insert or update on public.sales_pipeline_stages for each row execute function public.normalize_sales_stage();
create trigger sales_opportunities_normalize before insert or update on public.sales_opportunities for each row execute function public.normalize_sales_opportunity();
create trigger sales_opportunities_history after update of stage_id on public.sales_opportunities for each row execute function public.record_sales_stage_history();
create trigger sales_opportunity_contacts_normalize before insert or update on public.sales_opportunity_contacts for each row execute function public.normalize_sales_opportunity_contact();
create trigger sales_activities_normalize before insert or update on public.sales_activities for each row execute function public.normalize_sales_activity();

create or replace function public.ensure_default_sales_pipeline(target_company_id uuid, audit_actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare pipeline_uuid uuid;
begin
  select p.id into pipeline_uuid from public.sales_pipelines p where p.company_id=target_company_id and p.is_default and p.is_active and p.archived_at is null limit 1;
  if pipeline_uuid is null then
    insert into public.sales_pipelines(company_id,name,is_default,is_active,created_by,updated_by) values(target_company_id,'Standart Satış Pipeline’ı',true,true,audit_actor,audit_actor) returning id into pipeline_uuid;
  end if;
  insert into public.sales_pipeline_stages(company_id,pipeline_id,name,stage_key,position,default_probability,stale_after_days,is_closed,outcome)
  values
   (target_company_id,pipeline_uuid,'Yeni fırsat','new',1,10,7,false,null),(target_company_id,pipeline_uuid,'İhtiyaç belirlendi','needs_identified',2,20,10,false,null),
   (target_company_id,pipeline_uuid,'Görüşme yapıldı','meeting_completed',3,35,14,false,null),(target_company_id,pipeline_uuid,'Çözüm hazırlanıyor','solution_preparation',4,45,10,false,null),
   (target_company_id,pipeline_uuid,'Teklif gönderildi','quote_sent',5,60,14,false,null),(target_company_id,pipeline_uuid,'Müzakere','negotiation',6,75,14,false,null),
   (target_company_id,pipeline_uuid,'Karar bekleniyor','awaiting_decision',7,85,10,false,null),(target_company_id,pipeline_uuid,'Kazanıldı','won',8,100,null,true,'won'),
   (target_company_id,pipeline_uuid,'Kaybedildi','lost',9,0,null,true,'lost')
  on conflict(pipeline_id,stage_key) do nothing;
  return pipeline_uuid;
end $$;
revoke all on function public.ensure_default_sales_pipeline(uuid,uuid) from public,anon,authenticated;

create or replace function public.provision_sales_pipeline_for_company() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.ensure_default_sales_pipeline(new.id,new.created_by); return new; end $$;
create trigger companies_provision_sales_pipeline after insert on public.companies for each row execute function public.provision_sales_pipeline_for_company();
do $$ declare company_row record; begin for company_row in select c.id,c.created_by from public.companies c loop perform public.ensure_default_sales_pipeline(company_row.id,company_row.created_by); end loop; end $$;

create or replace function public.convert_sales_lead(
  target_company_id uuid, target_lead_id uuid, existing_party_id uuid default null,
  new_party_display_name text default null, create_contact boolean default true,
  opportunity_title text default null, target_pipeline_id uuid default null, target_stage_id uuid default null
) returns table(party_id uuid, contact_id uuid, opportunity_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); lead_row public.sales_leads%rowtype; selected_party uuid; selected_contact uuid; selected_pipeline uuid; selected_stage uuid; selected_opportunity uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into lead_row from public.sales_leads l where l.id=target_lead_id and l.company_id=target_company_id for update;
  if not found then raise exception 'Lead not found' using errcode='P0002'; end if;
  if lead_row.status in ('converted','disqualified') or lead_row.archived_at is not null then raise exception 'Lead cannot be converted' using errcode='23514'; end if;
  if existing_party_id is not null then select p.id into selected_party from public.business_parties p where p.id=existing_party_id and p.company_id=target_company_id and p.archived_at is null; if selected_party is null then raise exception 'Party not found' using errcode='23514'; end if;
  else
    insert into public.business_parties(company_id,party_type,display_name,main_email,main_phone,source,relationship_status,normalized_name,created_by,updated_by)
    values(target_company_id,lead_row.lead_type,coalesce(nullif(btrim(new_party_display_name),''),lead_row.company_name,concat_ws(' ',lead_row.first_name,lead_row.last_name)),lead_row.email,lead_row.phone,lead_row.source,'potential','pending',actor_id,actor_id) returning id into selected_party;
    insert into public.business_party_roles(company_id,party_id,role,created_by) values(target_company_id,selected_party,'prospect',actor_id);
  end if;
  if create_contact and lead_row.first_name is not null then insert into public.business_contacts(company_id,party_id,first_name,last_name,email,phone,created_by,updated_by) values(target_company_id,selected_party,lead_row.first_name,lead_row.last_name,lead_row.email,lead_row.phone,actor_id,actor_id) returning id into selected_contact; end if;
  selected_pipeline:=coalesce(target_pipeline_id,public.ensure_default_sales_pipeline(target_company_id,actor_id));
  select s.id into selected_stage from public.sales_pipeline_stages s where s.pipeline_id=selected_pipeline and s.company_id=target_company_id and (target_stage_id is null and not s.is_closed or s.id=target_stage_id) order by case when s.id=target_stage_id then 0 else 1 end,s.position limit 1;
  if selected_stage is null then raise exception 'Valid pipeline stage not found' using errcode='23514'; end if;
  insert into public.sales_opportunities(company_id,party_id,pipeline_id,stage_id,owner_user_id,title,expected_value,currency,product_interest,next_action,next_action_at,source,created_by,updated_by)
  values(target_company_id,selected_party,selected_pipeline,selected_stage,coalesce(lead_row.assigned_to,actor_id),coalesce(nullif(btrim(opportunity_title),''),coalesce(lead_row.company_name,lead_row.first_name)||' fırsatı'),coalesce(lead_row.estimated_value,0),lead_row.currency,lead_row.product_interest,lead_row.next_action,lead_row.next_action_at,lead_row.source,actor_id,actor_id) returning id into selected_opportunity;
  if selected_contact is not null then insert into public.sales_opportunity_contacts(company_id,opportunity_id,contact_id,is_primary,created_by) values(target_company_id,selected_opportunity,selected_contact,true,actor_id); end if;
  update public.sales_leads set status='converted',converted_party_id=selected_party,converted_contact_id=selected_contact,converted_opportunity_id=selected_opportunity,converted_at=now() where id=lead_row.id;
  return query select selected_party,selected_contact,selected_opportunity;
end $$;

create or replace function public.move_sales_opportunity_stage(target_company_id uuid,target_opportunity_id uuid,destination_stage_id uuid,transition_reason text default null,new_loss_reason text default null,new_next_action text default null,new_next_action_at timestamptz default null)
returns public.sales_opportunities language plpgsql security definer set search_path='' as $$
declare opportunity_row public.sales_opportunities%rowtype; current_stage public.sales_pipeline_stages%rowtype; destination_stage public.sales_pipeline_stages%rowtype; updated_row public.sales_opportunities%rowtype;
begin
 if auth.uid() is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
 select * into opportunity_row from public.sales_opportunities o where o.id=target_opportunity_id and o.company_id=target_company_id for update;
 if not found then raise exception 'Opportunity not found' using errcode='P0002'; end if;
 select * into current_stage from public.sales_pipeline_stages s where s.id=opportunity_row.stage_id;
 if current_stage.is_closed then raise exception 'Closed opportunities cannot be reopened in V1' using errcode='23514'; end if;
 select * into destination_stage from public.sales_pipeline_stages s where s.id=destination_stage_id and s.company_id=target_company_id and s.pipeline_id=opportunity_row.pipeline_id;
 if not found then raise exception 'Destination stage is invalid' using errcode='23514'; end if;
 if destination_stage.outcome='lost' and nullif(btrim(new_loss_reason),'') is null then raise exception 'Loss reason is required' using errcode='23514'; end if;
 perform set_config('octo.stage_reason',coalesce(transition_reason,''),true);
 update public.sales_opportunities set stage_id=destination_stage_id,loss_reason=case when destination_stage.outcome='lost' then new_loss_reason else null end,next_action=coalesce(new_next_action,next_action),next_action_at=coalesce(new_next_action_at,next_action_at) where id=opportunity_row.id returning * into updated_row;
 return updated_row;
end $$;

create or replace function public.set_sales_opportunity_contacts(target_company_id uuid,target_opportunity_id uuid,intended_contacts jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); contact_item jsonb;
begin
 if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
 if jsonb_typeof(intended_contacts)<>'array' then raise exception 'Contacts must be an array' using errcode='22023'; end if;
 if not exists(select 1 from public.sales_opportunities o where o.id=target_opportunity_id and o.company_id=target_company_id) then raise exception 'Opportunity not found' using errcode='P0002'; end if;
 delete from public.sales_opportunity_contacts c where c.opportunity_id=target_opportunity_id and c.company_id=target_company_id;
 for contact_item in select value from jsonb_array_elements(intended_contacts) loop
  insert into public.sales_opportunity_contacts(company_id,opportunity_id,contact_id,relationship_role,is_primary,created_by) values(target_company_id,target_opportunity_id,(contact_item->>'contact_id')::uuid,nullif(btrim(contact_item->>'relationship_role'),''),coalesce((contact_item->>'is_primary')::boolean,false),actor_id);
 end loop;
end $$;

revoke all on function public.convert_sales_lead(uuid,uuid,uuid,text,boolean,text,uuid,uuid) from public,anon;
revoke all on function public.move_sales_opportunity_stage(uuid,uuid,uuid,text,text,text,timestamptz) from public,anon;
revoke all on function public.set_sales_opportunity_contacts(uuid,uuid,jsonb) from public,anon;
grant execute on function public.convert_sales_lead(uuid,uuid,uuid,text,boolean,text,uuid,uuid) to authenticated;
grant execute on function public.move_sales_opportunity_stage(uuid,uuid,uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.set_sales_opportunity_contacts(uuid,uuid,jsonb) to authenticated;

alter table public.sales_leads enable row level security; alter table public.sales_pipelines enable row level security; alter table public.sales_pipeline_stages enable row level security;
alter table public.sales_opportunities enable row level security; alter table public.sales_opportunity_contacts enable row level security; alter table public.sales_activities enable row level security; alter table public.sales_opportunity_stage_history enable row level security;
revoke all on table public.sales_leads,public.sales_pipelines,public.sales_pipeline_stages,public.sales_opportunities,public.sales_opportunity_contacts,public.sales_activities,public.sales_opportunity_stage_history from public,anon,authenticated;
grant select,insert,update on public.sales_leads,public.sales_pipelines,public.sales_pipeline_stages,public.sales_opportunities,public.sales_opportunity_contacts,public.sales_activities to authenticated;
grant select on public.sales_opportunity_stage_history to authenticated;

create policy sales_leads_read on public.sales_leads for select to authenticated using(public.is_company_member(company_id));
create policy sales_leads_write on public.sales_leads for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_leads_update on public.sales_leads for update to authenticated using(public.is_company_operator(company_id)) with check(public.is_company_operator(company_id));
create policy sales_pipelines_read on public.sales_pipelines for select to authenticated using(public.is_company_member(company_id)); create policy sales_pipelines_write on public.sales_pipelines for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_pipelines_update on public.sales_pipelines for update to authenticated using(public.is_company_operator(company_id)) with check(public.is_company_operator(company_id));
create policy sales_stages_read on public.sales_pipeline_stages for select to authenticated using(public.is_company_member(company_id)); create policy sales_stages_write on public.sales_pipeline_stages for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_stages_update on public.sales_pipeline_stages for update to authenticated using(public.is_company_operator(company_id)) with check(public.is_company_operator(company_id));
create policy sales_opportunities_read on public.sales_opportunities for select to authenticated using(public.is_company_member(company_id)); create policy sales_opportunities_write on public.sales_opportunities for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_opportunities_update on public.sales_opportunities for update to authenticated using(public.is_company_operator(company_id)) with check(public.is_company_operator(company_id));
create policy sales_opp_contacts_read on public.sales_opportunity_contacts for select to authenticated using(public.is_company_member(company_id)); create policy sales_opp_contacts_write on public.sales_opportunity_contacts for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_opp_contacts_update on public.sales_opportunity_contacts for update to authenticated using(public.is_company_operator(company_id)) with check(public.is_company_operator(company_id));
create policy sales_activities_read on public.sales_activities for select to authenticated using((visibility='company' and public.is_company_member(company_id)) or (visibility='sales_team' and public.is_company_operator(company_id)) or (visibility='private' and created_by=auth.uid()));
create policy sales_activities_write on public.sales_activities for insert to authenticated with check(public.is_company_operator(company_id)); create policy sales_activities_update on public.sales_activities for update to authenticated using(public.is_company_operator(company_id) and (visibility<>'private' or created_by=auth.uid())) with check(public.is_company_operator(company_id));
create policy sales_history_read on public.sales_opportunity_stage_history for select to authenticated using(public.is_company_member(company_id));
