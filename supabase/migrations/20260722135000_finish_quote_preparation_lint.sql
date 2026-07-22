-- Integer FOR loops declare their own iterator; remove the redundant declaration.
do $$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    'comparable_count integer; accepted_count integer; quality text; prepared_position integer;',
    'comparable_count integer; accepted_count integer; quality text;');
  if changed = definition then raise exception 'Preparation iterator cleanup did not match function definition'; end if;
  execute changed;
end $$;
