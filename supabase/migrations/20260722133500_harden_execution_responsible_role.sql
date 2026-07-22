-- Responsible user must remain an authorized commercial operator.
do $$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    'm.user_id = owner_id and m.status = ''active''',
    'm.user_id = owner_id and m.role in (''owner'',''employee'') and m.status = ''active''');
  if changed = definition then raise exception 'Responsible-role preparation hardening did not match'; end if;
  execute changed;

  select pg_get_functiondef('public.approve_quote_execution_case(uuid,uuid,jsonb,text,text)'::regprocedure) into definition;
  changed := replace(definition,
    'if not exists(select 1 from public.business_parties p where p.id=c.target_party_id and p.company_id=c.company_id and p.archived_at is null) then raise exception ''Party is no longer active'' using errcode=''23514''; end if;',
    'if not exists(select 1 from public.business_parties p where p.id=c.target_party_id and p.company_id=c.company_id and p.archived_at is null) then raise exception ''Party is no longer active'' using errcode=''23514''; end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=c.company_id and m.user_id=c.responsible_user_id and m.role in (''owner'',''employee'') and m.status=''active'') then raise exception ''Responsible user is no longer an authorized operator'' using errcode=''42501''; end if;');
  if changed = definition then raise exception 'Responsible-role approval hardening did not match'; end if;
  execute changed;
end $$;
