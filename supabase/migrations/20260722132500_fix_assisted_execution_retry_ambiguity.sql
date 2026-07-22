-- Narrow repair found by remote duplicate-execution verification.
do $$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.approve_quote_execution_case(uuid,uuid,jsonb,text,text)'::regprocedure) into definition;
  changed := replace(definition,
    'select quote_number into created_number from public.sales_quotes where id=c.executed_quote_id;',
    'select q.quote_number into created_number from public.sales_quotes q where q.id=c.executed_quote_id;');
  if changed = definition then raise exception 'Retry ambiguity repair did not match approval function'; end if;
  execute changed;
end $$;
