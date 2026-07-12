-- Resolve the PL/pgSQL variable/column ambiguity in lead deduplication.
create or replace function public.submit_founder_50_lead(
  lead_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_lead_email text := lower(btrim(lead_email));
begin
  if normalized_lead_email is null
    or normalized_lead_email = ''
    or char_length(normalized_lead_email) > 320
    or normalized_lead_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid lead email is required'
      using errcode = '22023';
  end if;

  insert into public.founder_50_leads (email, normalized_email)
  values (normalized_lead_email, normalized_lead_email)
  on conflict (normalized_email) do nothing;

  return true;
end;
$$;

revoke all on function public.submit_founder_50_lead(text) from public;
grant execute on function public.submit_founder_50_lead(text) to anon, authenticated;
