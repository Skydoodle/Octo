-- Keep comparable commercial context inspectable and reconcile line-price blockers after review edits.
do $migration$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    $$'outcome',comparable.status);$$,
    $$'outcome',comparable.status,'discount_type',comparable.discount_type,'discount_value',comparable.discount_value);$$);
  if changed = definition then raise exception 'Comparable commercial context update did not match preparation function'; end if;
  execute changed;

  select pg_get_functiondef('public.save_quote_execution_review(uuid,uuid,jsonb,text,text)'::regprocedure) into definition;
  changed := replace(definition,
    $$if jsonb_typeof(reviewed_content)<>'object' or jsonb_typeof(reviewed_content->'lines')<>'array' then raise exception 'Invalid quote draft artifact' using errcode='23514'; end if;$$,
    $$if jsonb_typeof(reviewed_content)<>'object' or jsonb_typeof(reviewed_content->'lines')<>'array' or jsonb_array_length(reviewed_content->'lines')=0 then raise exception 'Invalid quote draft artifact' using errcode='23514'; end if;$$);
  if changed = definition then raise exception 'Empty-line validation did not match review function'; end if;
  definition := changed;
  changed := replace(definition,
    $$  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'artifact_version_created','user',actor_id,jsonb_build_object('artifact_type','quote_draft','version_number',next_version,'edit_category',edit_category,'reason',nullif(btrim(edit_reason),'')));$$,
    $$  perform set_config('octo.execution_controlled_write','on',true);
  update public.execution_missing_inputs m
     set resolved_value=jsonb_build_object('review_reconciled',true),resolved_by=actor_id,resolved_at=now()
   where m.case_id=c.id and m.input_key like 'lines.%.unit_price' and m.resolved_at is null
     and not exists (
       select 1 from jsonb_array_elements(reviewed_content->'lines') reviewed_line
        where m.input_key='lines.'||(reviewed_line->>'position')||'.unit_price'
          and coalesce(nullif(reviewed_line->>'unit_price','')::numeric,0)<=0
     );
  update public.execution_missing_inputs m
     set resolved_value=null,resolved_by=null,resolved_at=null
   where m.case_id=c.id and m.input_key like 'lines.%.unit_price' and m.resolved_at is not null
     and exists (
       select 1 from jsonb_array_elements(reviewed_content->'lines') reviewed_line
        where m.input_key='lines.'||(reviewed_line->>'position')||'.unit_price'
          and coalesce(nullif(reviewed_line->>'unit_price','')::numeric,0)<=0
     );
  perform set_config('octo.execution_controlled_write','',true);
  insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type)
  select target_company_id,c.id,'lines.'||(reviewed_line->>'position')||'.unit_price',(reviewed_line->>'position')||'. kalem için savunulabilir birim fiyat','critical',true,'number'
    from jsonb_array_elements(reviewed_content->'lines') reviewed_line
   where coalesce(nullif(reviewed_line->>'unit_price','')::numeric,0)<=0
  on conflict (case_id,input_key) do nothing;
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'artifact_version_created','user',actor_id,jsonb_build_object('artifact_type','quote_draft','version_number',next_version,'edit_category',edit_category,'reason',nullif(btrim(edit_reason),'')));$$);
  if changed = definition then raise exception 'Line review reconciliation did not match review function'; end if;
  execute changed;
end
$migration$;
