-- Use the quotation domain's linked opportunity forecast category for the final comparable tie-break.
do $migration$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;
  changed := replace(definition,
    'target_opportunity_id is not null and opportunity_row.product_interest is not null and qo.product_interest = opportunity_row.product_interest',
    'target_opportunity_id is not null and opportunity_row.forecast_category is not null and qo.forecast_category = opportunity_row.forecast_category');
  if changed = definition then raise exception 'Canonical opportunity category tie-break did not match preparation function'; end if;
  execute changed;
end
$migration$;
