-- Narrow repair for the output-parameter/column ambiguity found by remote
-- transactional verification. The source migration is also qualified for
-- clean installations; this recreates only the already-installed RPC body.
do $repair$
declare function_definition text;
begin
  select pg_get_functiondef('public.refresh_customer_health_assessment(uuid,uuid,date)'::regprocedure)
    into function_definition;
  function_definition:=replace(function_definition,
    'from public.customer_health_factors where assessment_id=new_id;',
    'from public.customer_health_factors f where f.assessment_id=new_id;');
  function_definition:=replace(function_definition,
    'exists(select 1 from public.customer_health_evidence where assessment_id=new_id)',
    'exists(select 1 from public.customer_health_evidence e where e.assessment_id=new_id)');
  if function_definition like '%where assessment_id=new_id%' then
    raise exception 'Customer health ambiguity repair did not qualify every reference';
  end if;
  execute function_definition;
end $repair$;
