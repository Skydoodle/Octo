-- Secure landing-page lead capture for the Kurucu 50 program.
create table public.founder_50_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null unique,
  source text not null default 'landing_page',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  check (email = normalized_email),
  check (normalized_email = lower(btrim(normalized_email)))
);

alter table public.founder_50_leads enable row level security;

revoke all on table public.founder_50_leads from public, anon, authenticated;

create or replace function public.submit_founder_50_lead(
  lead_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(lead_email));
begin
  if normalized_email is null
    or normalized_email = ''
    or char_length(normalized_email) > 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid lead email is required'
      using errcode = '22023';
  end if;

  insert into public.founder_50_leads (email, normalized_email)
  values (normalized_email, normalized_email)
  on conflict (normalized_email) do nothing;

  return true;
end;
$$;

revoke all on function public.submit_founder_50_lead(text) from public;
grant execute on function public.submit_founder_50_lead(text) to anon, authenticated;
