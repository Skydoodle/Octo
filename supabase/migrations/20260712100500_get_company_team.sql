-- Team Access V1: owner-only roster access without broad auth.users grants.
create or replace function public.get_company_team(
  target_company_id uuid
)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  email text,
  role text,
  status text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if target_company_id is null or not exists (
    select 1
    from public.company_memberships as owner_membership
    where owner_membership.company_id = target_company_id
      and owner_membership.user_id = current_user_id
      and owner_membership.role = 'owner'
      and owner_membership.status = 'active'
  ) then
    raise exception 'An active company owner is required'
      using errcode = '42501';
  end if;

  return query
  select
    membership.id as membership_id,
    membership.user_id,
    profile.display_name,
    lower(auth_user.email) as email,
    membership.role,
    membership.status,
    membership.created_at as joined_at
  from public.company_memberships as membership
  left join public.profiles as profile
    on profile.id = membership.user_id
  join auth.users as auth_user
    on auth_user.id = membership.user_id
  where membership.company_id = target_company_id
  order by
    case when membership.role = 'owner' then 0 else 1 end,
    lower(coalesce(nullif(btrim(profile.display_name), ''), auth_user.email)),
    membership.created_at,
    membership.id;
end;
$$;

revoke all on function public.get_company_team(uuid) from public, anon;
grant execute on function public.get_company_team(uuid) to authenticated;
