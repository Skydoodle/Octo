-- Remove local PL/pgSQL warnings without changing preparation behavior.
do $$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    'comparable_count integer; accepted_count integer; quality text; email_subject text; email_body text;',
    'comparable_count integer; accepted_count integer; quality text; prepared_position integer;');
  changed := replace(changed,
    'for position_value in 1..jsonb_array_length(prepared_lines) loop
    if (prepared_lines->(position_value-1)->''unit_price'') = ''null''::jsonb then
      insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,''lines.''||position_value||''.unit_price'',position_value||''. kalem için savunulabilir birim fiyat'',''critical'',true,''number'');',
    'for prepared_position in 1..jsonb_array_length(prepared_lines) loop
    if (prepared_lines->(prepared_position-1)->''unit_price'') = ''null''::jsonb then
      insert into public.execution_missing_inputs(company_id,case_id,input_key,label,severity,blocking,resolution_type) values(target_company_id,created_case_id,''lines.''||prepared_position||''.unit_price'',prepared_position||''. kalem için savunulabilir birim fiyat'',''critical'',true,''number'');');
  if changed = definition then raise exception 'Preparation lint cleanup did not match function definition'; end if;
  execute changed;
end $$;
