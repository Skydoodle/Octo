-- Match the documented comparable ranking order and expose descriptive discount sample size.
do $migration$
declare definition text; changed text;
begin
  select pg_get_functiondef('public.prepare_quote_execution_case(uuid,uuid,uuid,uuid,uuid,uuid,text,text,date,text,text,date,text,text,jsonb,timestamptz)'::regprocedure) into definition;

  changed := replace(definition,
    'select q.id quote_id, q.quote_number, q.issue_date, q.status, qi.quantity, qi.unit_price, qi.discount_type, qi.discount_value',
    'select q.id quote_id, q.quote_number, q.issue_date, q.status, qi.quantity, qi.unit_price, qi.discount_type, qi.discount_value, count(*) over () discount_sample_size');
  if changed = definition then raise exception 'Comparable sample-size projection did not match preparation function'; end if;
  definition := changed;

  changed := replace(definition,
    'join public.sales_quote_items qi on qi.quote_version_id = qv.id and qi.company_id = q.company_id',
    'join public.sales_quote_items qi on qi.quote_version_id = qv.id and qi.company_id = q.company_id
        left join public.sales_opportunities qo on qo.id = q.opportunity_id and qo.company_id = q.company_id');
  if changed = definition then raise exception 'Comparable opportunity-category join did not match preparation function'; end if;
  definition := changed;

  changed := replace(definition,
    'order by (qi.quantity between quantity_value * 0.75 and quantity_value * 1.25) desc, q.issue_date desc, (q.status = ''accepted'') desc, q.id',
    'order by (qi.quantity between quantity_value * 0.75 and quantity_value * 1.25) desc, q.issue_date desc, (q.status = ''accepted'') desc, (target_opportunity_id is not null and opportunity_row.product_interest is not null and qo.product_interest = opportunity_row.product_interest) desc, q.id');
  if changed = definition then raise exception 'Comparable category tie-break did not match preparation function'; end if;
  definition := changed;

  changed := replace(definition,
    $$'discount_type',comparable.discount_type,'discount_value',comparable.discount_value);$$,
    $$'discount_type',comparable.discount_type,'discount_value',comparable.discount_value,'discount_sample_size',comparable.discount_sample_size);$$);
  if changed = definition then raise exception 'Comparable discount sample context did not match preparation function'; end if;
  execute changed;
end
$migration$;
