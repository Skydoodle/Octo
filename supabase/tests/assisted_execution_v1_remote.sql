-- Runs only against an isolated transaction and always rolls back.
begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','octo-ae-owner@test.invalid','',now(),'{}','{}',now(),now()),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','octo-ae-employee@test.invalid','',now(),'{}','{}',now(),now()),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','octo-ae-accountant@test.invalid','',now(),'{}','{}',now(),now()),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','octo-ae-other@test.invalid','',now(),'{}','{}',now(),now());

insert into public.companies(id,name,created_by) values
('20000000-0000-0000-0000-000000000001','AE Verification A','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','AE Verification B','10000000-0000-0000-0000-000000000004');
insert into public.company_memberships(company_id,user_id,role,status) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner','active'),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','employee','active'),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','accountant','active'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','owner','active');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.business_parties(id,company_id,display_name,relationship_status,normalized_name,main_phone,address,tax_id,created_by,updated_by) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','AE Test Firma A','active','ae test firma a','PRIVATE-PHONE','PRIVATE-ADDRESS','PRIVATE-TAX','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','AE Test Firma B','active','ae test firma b',null,null,null,'10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004');
insert into public.business_party_roles(company_id,party_id,role,created_by) values
('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','customer','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','customer','10000000-0000-0000-0000-000000000004');
insert into public.sales_activities(company_id,activity_type,party_id,owner_user_id,title,description,visibility,created_by,updated_by) values
('20000000-0000-0000-0000-000000000001','note','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Güvenli başlık','PRIVATE-ACTIVITY-BODY','private','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000001','meeting','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Görüşme','COMPANY-ACTIVITY-BODY','company','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');

create temporary table verify_ids(key text primary key,id uuid,value text) on commit drop;
grant all on table pg_temp.verify_ids to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['execution_cases','execution_evidence','execution_assumptions','execution_missing_inputs','execution_artifacts','execution_decisions','execution_field_edits','execution_events','execution_outcomes'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=table_name and c.relrowsecurity) then raise exception 'RLS missing for %',table_name; end if;
    if has_table_privilege('anon','public.'||table_name,'select') then raise exception 'Anonymous select unexpectedly granted for %',table_name; end if;
    if has_table_privilege('authenticated','public.'||table_name,'insert') or has_table_privilege('authenticated','public.'||table_name,'update') or has_table_privilege('authenticated','public.'||table_name,'delete') then raise exception 'Direct mutation unexpectedly granted for %',table_name; end if;
  end loop;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
insert into pg_temp.verify_ids(key,id,value)
select 'case_a',case_id,created_new::text from public.prepare_quote_execution_case(
  '20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null,null,null,'10000000-0000-0000-0000-000000000002','workbench','TRY',current_date+14,'30 gün',null,null,null,null,
  '[{"position":1,"description":"Danışmanlık","quantity":2,"unit":"gün","unit_price":null,"vat_rate":20}]'::jsonb,null);

do $$
declare first_id uuid; again_id uuid; again_new boolean;
begin
  select id into first_id from pg_temp.verify_ids where key='case_a';
  select case_id,created_new into again_id,again_new from public.prepare_quote_execution_case(
    '20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null,null,null,'10000000-0000-0000-0000-000000000002','workbench','TRY',current_date+14,'30 gün',null,null,null,null,
    '[{"position":1,"description":"Danışmanlık","quantity":2,"unit":"gün","unit_price":null,"vat_rate":20}]'::jsonb,null);
  if again_id<>first_id or again_new then raise exception 'Unchanged preparation was not idempotent'; end if;
  if not exists(select 1 from public.execution_missing_inputs where case_id=first_id and input_key='lines.1.unit_price' and blocking and resolved_at is null) then raise exception 'Missing price did not block'; end if;
  if not exists(select 1 from public.execution_missing_inputs where case_id=first_id and input_key='delivery_confirmation' and blocking and resolved_at is null) then raise exception 'Delivery confirmation did not block'; end if;
  if exists(select 1 from public.execution_evidence where case_id=first_id and (safe_summary||metadata::text) ~ 'PRIVATE-|COMPANY-ACTIVITY-BODY') then raise exception 'Private activity content copied into evidence'; end if;
  if exists(select 1 from public.execution_evidence where case_id=first_id and (safe_summary||metadata::text) ~ 'PRIVATE-PHONE|PRIVATE-ADDRESS|PRIVATE-TAX') then raise exception 'Sensitive party data copied into evidence'; end if;
end $$;

do $$
declare c_id uuid; draft jsonb;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';
  select content into draft from public.execution_artifacts where case_id=c_id and artifact_type='quote_draft' and superseded_at is null;
  draft:=jsonb_set(draft,'{lines}',draft->'lines'||'[{"position":2,"description":"Ek inceleme kalemi","quantity":1,"unit":"adet","unit_price":null,"price_source":null,"discount_type":null,"discount_value":0,"vat_rate":20,"other_tax_rate":0,"unit_cost":null}]'::jsonb);
  perform public.save_quote_execution_review('20000000-0000-0000-0000-000000000001',c_id,draft,'missing_context','Kalem ekleme doğrulaması');
  if not exists(select 1 from public.execution_missing_inputs where case_id=c_id and input_key='lines.2.unit_price' and resolved_at is null) then raise exception 'Added line did not create a price blocker'; end if;
  draft:=jsonb_set(draft,'{lines}',(draft->'lines')-1);
  perform public.save_quote_execution_review('20000000-0000-0000-0000-000000000001',c_id,draft,'error_correction','Kalem kaldırma doğrulaması');
  if not exists(select 1 from public.execution_missing_inputs where case_id=c_id and input_key='lines.2.unit_price' and resolved_at is not null) then raise exception 'Removed line price blocker was not reconciled'; end if;
end $$;

select public.resolve_execution_missing_input('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='case_a'),'lines.1.unit_price','1250'::jsonb);
select public.resolve_execution_missing_input('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='case_a'),'delivery_confirmation','true'::jsonb);
do $$
declare c_id uuid; draft jsonb;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';
  select content into draft from public.execution_artifacts where case_id=c_id and artifact_type='quote_draft' and superseded_at is null;
  draft:=jsonb_set(draft,'{lines,0,unit_price}','1250'::jsonb);
  draft:=jsonb_set(draft,'{lines,0,price_source}','{"type":"user_input","label":"Doğrulama kullanıcısı"}'::jsonb);
  perform public.save_quote_execution_review('20000000-0000-0000-0000-000000000001',c_id,draft,'pricing','Eksik fiyat açıkça sağlandı');
end $$;
insert into pg_temp.verify_ids(key,id,value)
select 'quote_a',quote_id,quote_number from public.approve_quote_execution_case('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='case_a'),null,'pricing','İnsan onayı') where execution_succeeded;

do $$
declare c_id uuid;q_id uuid;retry_id uuid;quote_count integer;finance_before integer;health_before integer;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';select id into q_id from pg_temp.verify_ids where key='quote_a';
  if q_id is null then raise exception 'Atomic approval did not return a quote'; end if;
  if not exists(select 1 from public.sales_quotes q join public.sales_quote_versions v on v.id=q.current_version_id join public.sales_quote_items i on i.quote_version_id=v.id join public.sales_quote_status_history h on h.quote_id=q.id where q.id=q_id and q.status='draft' and v.version_number=1 and i.unit_price=1250 and h.to_status='draft') then raise exception 'Normal quotation records were not atomically created'; end if;
  if exists(select 1 from public.sales_orders where source_quote_id=q_id) then raise exception 'Approval created a Sales Order'; end if;
  select quote_id into retry_id from public.approve_quote_execution_case('20000000-0000-0000-0000-000000000001',c_id,null,'other',null);
  if retry_id<>q_id then raise exception 'Duplicate execution retry did not return authoritative quote'; end if;
  select count(*) into quote_count from public.sales_quotes where party_id='30000000-0000-0000-0000-000000000001';if quote_count<>1 then raise exception 'Duplicate quote created on retry';end if;
  if not exists(select 1 from public.execution_outcomes where case_id=c_id and outcome_type='quotation_created' and source_record_id=q_id) then raise exception 'Quotation-created outcome missing';end if;
  begin perform public.submit_execution_case_decision('20000000-0000-0000-0000-000000000001',c_id,'reject','other','invalid transition');raise exception 'Terminal executed case was reopened';exception when check_violation then null;end;
end $$;

select * from public.create_sales_quote_revision('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='quote_a'),'Remote verification revision','[{"position":1,"description":"Danışmanlık","quantity":2,"unit":"gün","unit_price":1300,"discount_type":null,"discount_value":0,"vat_rate":20,"other_tax_rate":0,"unit_cost":null}]'::jsonb,current_date+14,'30 gün',null,null,null,null);
select public.transition_sales_quote_status('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='quote_a'),'sent','Doğrulama gönderim kaydı',null);
select public.transition_sales_quote_status('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='quote_a'),'accepted','Doğrulama kabul kaydı',null);
select * from public.convert_accepted_quote_to_sales_order('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='quote_a'),current_date,null,'Remote verification');

do $$
declare c_id uuid;q_id uuid;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';select id into q_id from pg_temp.verify_ids where key='quote_a';
  if (select status from public.execution_cases where id=c_id)<>'completed' then raise exception 'Terminal quotation outcome did not complete the case';end if;
  if not exists(select 1 from public.execution_outcomes where case_id=c_id and outcome_type='quotation_revision_created') then raise exception 'Revision outcome missing';end if;
  if not exists(select 1 from public.execution_outcomes where case_id=c_id and outcome_type='quotation_sent') then raise exception 'Sent outcome missing';end if;
  if not exists(select 1 from public.execution_outcomes where case_id=c_id and outcome_type='quotation_accepted' and conclusive) then raise exception 'Accepted outcome missing';end if;
  if not exists(select 1 from public.execution_outcomes where case_id=c_id and outcome_type='sales_order_created' and conclusive) then raise exception 'Sales Order outcome missing';end if;
  if exists(select 1 from public.finance_invoices where source_sales_order_id in (select id from public.sales_orders where source_quote_id=q_id)) then raise exception 'Assisted Execution mutated Finance';end if;
end $$;

insert into pg_temp.verify_ids(key,id,value)
select 'case_fail',case_id,created_new::text from public.prepare_quote_execution_case(
  '20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null,null,null,'10000000-0000-0000-0000-000000000002','manual','TRY',current_date+21,'Peşin',null,null,null,null,
  '[{"position":1,"description":"Failure probe","quantity":1,"unit":"adet","unit_price":10,"discount_type":"fixed","discount_value":999,"vat_rate":20}]'::jsonb,null);
select public.resolve_execution_missing_input('20000000-0000-0000-0000-000000000001',(select id from pg_temp.verify_ids where key='case_fail'),'delivery_confirmation','true'::jsonb);
do $$
declare result record;c_id uuid;
begin
  select id into c_id from pg_temp.verify_ids where key='case_fail';select * into result from public.approve_quote_execution_case('20000000-0000-0000-0000-000000000001',c_id,null,'other','Rollback probe');
  if result.execution_succeeded or result.quote_id is not null then raise exception 'Invalid quotation execution unexpectedly succeeded';end if;
  if (select status from public.execution_cases where id=c_id)<>'failed' then raise exception 'Execution failure was not preserved';end if;
  if exists(select 1 from public.sales_quotes where party_id='30000000-0000-0000-0000-000000000001' and quote_number=result.quote_number) then raise exception 'Failed execution left a partial quote';end if;
  if not exists(select 1 from public.execution_events where case_id=c_id and event_type='execution_failed') then raise exception 'Failure audit event missing';end if;
end $$;

set local role postgres;
select set_config('request.jwt.claim.sub','',true);
do $$
declare c_id uuid;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';
  begin insert into public.execution_evidence(company_id,case_id,evidence_type,source_domain,source_type,label,safe_summary) values('20000000-0000-0000-0000-000000000002',c_id,'probe','crm','probe','Probe','Probe');raise exception 'Cross-company FK unexpectedly allowed';exception when foreign_key_violation then null;end;
  begin update public.execution_events set payload='{}' where case_id=c_id;raise exception 'Immutable event update unexpectedly allowed';exception when insufficient_privilege then null;end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$
declare c_id uuid;
begin
  select id into c_id from pg_temp.verify_ids where key='case_a';
  if not exists(select 1 from public.execution_cases where id=c_id) then raise exception 'Accountant permitted read failed';end if;
  begin perform public.prepare_quote_execution_case('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null,null,null,null,'manual','TRY',current_date+14,'30 gün',null,null,null,null,'[{"position":1,"description":"Denied","quantity":1,"unit":"adet","unit_price":1}]'::jsonb,null);raise exception 'Accountant mutation unexpectedly allowed';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
insert into pg_temp.verify_ids(key,id,value)
select 'case_b',case_id,created_new::text from public.prepare_quote_execution_case(
  '20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',null,null,null,'10000000-0000-0000-0000-000000000004','manual','TRY',current_date+14,'Peşin',null,null,null,null,
  '[{"position":1,"description":"Company B","quantity":1,"unit":"adet","unit_price":50}]'::jsonb,null);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin if exists(select 1 from public.execution_cases where company_id='20000000-0000-0000-0000-000000000002') then raise exception 'Cross-company RLS read unexpectedly allowed';end if;end $$;

rollback;
