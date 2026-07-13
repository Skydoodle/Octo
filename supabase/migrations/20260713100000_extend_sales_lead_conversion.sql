-- Extend atomic lead conversion with opportunity fields required by Sales Execution UI V1.
drop function if exists public.convert_sales_lead(uuid,uuid,uuid,text,boolean,text,uuid,uuid);

create or replace function public.convert_sales_lead(
  target_company_id uuid, target_lead_id uuid, existing_party_id uuid default null,
  new_party_display_name text default null, create_contact boolean default true,
  opportunity_title text default null, target_pipeline_id uuid default null, target_stage_id uuid default null,
  opportunity_expected_value numeric default null, opportunity_currency text default null,
  opportunity_owner_user_id uuid default null, opportunity_expected_close_date date default null,
  opportunity_product_interest text default null, opportunity_next_action text default null,
  opportunity_next_action_at timestamptz default null
) returns table(party_id uuid, contact_id uuid, opportunity_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); lead_row public.sales_leads%rowtype; selected_party uuid; selected_contact uuid; selected_pipeline uuid; selected_stage uuid; selected_opportunity uuid; selected_owner uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  select * into lead_row from public.sales_leads l where l.id=target_lead_id and l.company_id=target_company_id for update;
  if not found then raise exception 'Lead not found' using errcode='P0002'; end if;
  if lead_row.status in ('converted','disqualified') or lead_row.archived_at is not null then raise exception 'Lead cannot be converted' using errcode='23514'; end if;
  if existing_party_id is not null then
    select p.id into selected_party from public.business_parties p where p.id=existing_party_id and p.company_id=target_company_id and p.archived_at is null;
    if selected_party is null then raise exception 'Party not found' using errcode='23514'; end if;
  else
    insert into public.business_parties(company_id,party_type,display_name,main_email,main_phone,source,relationship_status,normalized_name,created_by,updated_by)
    values(target_company_id,lead_row.lead_type,coalesce(nullif(btrim(new_party_display_name),''),lead_row.company_name,concat_ws(' ',lead_row.first_name,lead_row.last_name)),lead_row.email,lead_row.phone,lead_row.source,'potential','pending',actor_id,actor_id) returning id into selected_party;
    insert into public.business_party_roles(company_id,party_id,role,created_by) values(target_company_id,selected_party,'prospect',actor_id);
  end if;
  if create_contact and lead_row.first_name is not null then
    insert into public.business_contacts(company_id,party_id,first_name,last_name,email,phone,created_by,updated_by)
    values(target_company_id,selected_party,lead_row.first_name,lead_row.last_name,lead_row.email,lead_row.phone,actor_id,actor_id) returning id into selected_contact;
  end if;
  selected_pipeline:=coalesce(target_pipeline_id,public.ensure_default_sales_pipeline(target_company_id,actor_id));
  select s.id into selected_stage from public.sales_pipeline_stages s where s.pipeline_id=selected_pipeline and s.company_id=target_company_id and (target_stage_id is null and not s.is_closed or s.id=target_stage_id) order by case when s.id=target_stage_id then 0 else 1 end,s.position limit 1;
  if selected_stage is null then raise exception 'Valid pipeline stage not found' using errcode='23514'; end if;
  selected_owner:=coalesce(opportunity_owner_user_id,lead_row.assigned_to,actor_id);
  insert into public.sales_opportunities(company_id,party_id,pipeline_id,stage_id,owner_user_id,title,expected_value,currency,expected_close_date,product_interest,next_action,next_action_at,source,created_by,updated_by)
  values(target_company_id,selected_party,selected_pipeline,selected_stage,selected_owner,coalesce(nullif(btrim(opportunity_title),''),coalesce(lead_row.company_name,lead_row.first_name)||' fırsatı'),coalesce(opportunity_expected_value,lead_row.estimated_value,0),coalesce(opportunity_currency,lead_row.currency),opportunity_expected_close_date,coalesce(nullif(btrim(opportunity_product_interest),''),lead_row.product_interest),coalesce(nullif(btrim(opportunity_next_action),''),lead_row.next_action),coalesce(opportunity_next_action_at,lead_row.next_action_at),lead_row.source,actor_id,actor_id) returning id into selected_opportunity;
  if selected_contact is not null then insert into public.sales_opportunity_contacts(company_id,opportunity_id,contact_id,is_primary,created_by) values(target_company_id,selected_opportunity,selected_contact,true,actor_id); end if;
  update public.sales_leads set status='converted',converted_party_id=selected_party,converted_contact_id=selected_contact,converted_opportunity_id=selected_opportunity,converted_at=now() where id=lead_row.id;
  return query select selected_party,selected_contact,selected_opportunity;
end $$;

revoke all on function public.convert_sales_lead(uuid,uuid,uuid,text,boolean,text,uuid,uuid,numeric,text,uuid,date,text,text,timestamptz) from public,anon;
grant execute on function public.convert_sales_lead(uuid,uuid,uuid,text,boolean,text,uuid,uuid,numeric,text,uuid,date,text,text,timestamptz) to authenticated;
