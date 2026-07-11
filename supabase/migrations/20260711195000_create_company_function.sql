-- Atomically create a company and its initial owner membership.
create or replace function public.create_company(
  company_name text,
  company_base_currency text default 'TRY'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if company_name is null or btrim(company_name) = '' then
    raise exception 'Company name cannot be blank'
      using errcode = '22023';
  end if;

  if company_base_currency is null
    or company_base_currency not in ('TRY', 'EUR', 'USD', 'GBP') then
    raise exception 'Unsupported company base currency'
      using errcode = '22023';
  end if;

  insert into public.companies (name, base_currency, created_by)
  values (btrim(company_name), company_base_currency, current_user_id)
  returning id into new_company_id;

  insert into public.company_memberships (company_id, user_id, role, status)
  values (new_company_id, current_user_id, 'owner', 'active');

  return new_company_id;
end;
$$;

revoke all on function public.create_company(text, text) from public;
revoke all on function public.create_company(text, text) from anon;
grant execute on function public.create_company(text, text) to authenticated;
