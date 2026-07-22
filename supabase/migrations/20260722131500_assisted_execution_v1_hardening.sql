-- Hardening found while exercising refresh and editable cover artifacts.

do $$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    'if unit_price_value is not null and unit_price_value > 0 then',
    'if unit_price_value is not null and unit_price_value > 0 and coalesce(line->''price_source''->>''type'',''user_input'') = ''user_input'' then');
  changed := replace(changed,
    'order by (q.status = ''accepted'') desc, (qi.quantity between quantity_value * 0.75 and quantity_value * 1.25) desc, q.issue_date desc, q.id',
    'order by (qi.quantity between quantity_value * 0.75 and quantity_value * 1.25) desc, q.issue_date desc, (q.status = ''accepted'') desc, q.id');
  changed := replace(changed, 'requested_lines::text,', 'prepared_lines::text,');
  if changed = definition then raise exception 'Quote preparation hardening did not match function definition'; end if;
  execute changed;

  select pg_get_functiondef('public.approve_quote_execution_case(uuid,uuid,jsonb,text,text)'::regprocedure) into definition;
  changed := replace(definition, 'decision_value||''d''', 'case when decision_value=''approve_with_edits'' then ''approved_with_edits'' else ''approved'' end');
  if changed = definition then raise exception 'Approval event hardening did not match function definition'; end if;
  execute changed;
end $$;

create or replace function public.save_execution_text_artifact(target_company_id uuid,target_case_id uuid,target_artifact_type text,reviewed_content jsonb,edit_reason text default null)
returns public.execution_artifacts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid:=auth.uid(); c public.execution_cases%rowtype; current_artifact public.execution_artifacts%rowtype; new_artifact public.execution_artifacts%rowtype; next_version integer;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then raise exception 'Operator access is required' using errcode='42501'; end if;
  if target_artifact_type <> 'cover_email_draft' or jsonb_typeof(reviewed_content) <> 'object' or nullif(btrim(reviewed_content->>'subject'),'') is null or nullif(btrim(reviewed_content->>'body'),'') is null then raise exception 'Invalid editable text artifact' using errcode='23514'; end if;
  select * into c from public.execution_cases x where x.id=target_case_id and x.company_id=target_company_id for update;
  if not found or c.status not in ('prepared','awaiting_review','failed') then raise exception 'Case artifact cannot be edited' using errcode='23514'; end if;
  select * into current_artifact from public.execution_artifacts x where x.case_id=c.id and x.artifact_type=target_artifact_type and x.superseded_at is null for update;
  if current_artifact.content = reviewed_content then return current_artifact; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.execution_artifacts where case_id=c.id and artifact_type=target_artifact_type;
  perform set_config('octo.execution_controlled_write','on',true);
  update public.execution_artifacts set superseded_at=now() where id=current_artifact.id;
  perform set_config('octo.execution_controlled_write','',true);
  insert into public.execution_artifacts(company_id,case_id,artifact_type,version_number,content,source_fingerprint,prepared_by) values(target_company_id,c.id,target_artifact_type,next_version,reviewed_content,c.source_fingerprint,actor_id) returning * into new_artifact;
  if current_artifact.content->'subject' is distinct from reviewed_content->'subject' then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,'cover_email.subject',current_artifact.content->'subject',reviewed_content->'subject','wording',actor_id); end if;
  if current_artifact.content->'body' is distinct from reviewed_content->'body' then insert into public.execution_field_edits(company_id,case_id,artifact_id,field_path,original_value,final_value,edit_category,edited_by) values(target_company_id,c.id,new_artifact.id,'cover_email.body',current_artifact.content->'body',reviewed_content->'body','wording',actor_id); end if;
  insert into public.execution_events(company_id,case_id,event_type,actor_type,actor_user_id,payload) values(target_company_id,c.id,'artifact_version_created','user',actor_id,jsonb_build_object('artifact_type',target_artifact_type,'version_number',next_version,'edit_category','wording','reason',nullif(btrim(edit_reason),'')));
  return new_artifact;
end $$;

revoke all on function public.save_execution_text_artifact(uuid,uuid,text,jsonb,text) from public,anon;
grant execute on function public.save_execution_text_artifact(uuid,uuid,text,jsonb,text) to authenticated;
