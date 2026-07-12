-- Team Access V1: secure company invitations and atomic invitation workflows.
create extension if not exists pgcrypto with schema extensions;

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) > 0
  ),
  role text not null check (role in ('employee', 'accountant')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_by is null and accepted_at is null)
  )
);

create unique index company_invitations_one_pending_per_email
  on public.company_invitations (company_id, email)
  where status = 'pending';

create trigger company_invitations_set_updated_at
  before update on public.company_invitations
  for each row execute procedure public.set_updated_at();

alter table public.company_invitations enable row level security;

revoke all on table public.company_invitations from public, anon, authenticated;
grant select on table public.company_invitations to authenticated;

create policy "Owners can view company invitations"
on public.company_invitations
for select
to authenticated
using (
  auth.uid() is not null
  and public.is_company_owner(company_id)
);

create or replace function public.create_company_invitation(
  target_company_id uuid,
  invited_email text,
  invited_role text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(btrim(invited_email));
  normalized_role text := lower(btrim(invited_role));
  raw_token text;
  hashed_token text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if target_company_id is null or not exists (
    select 1
    from public.company_memberships
    where company_id = target_company_id
      and user_id = current_user_id
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'An active company owner is required'
      using errcode = '42501';
  end if;

  if normalized_email is null
    or normalized_email = ''
    or char_length(normalized_email) > 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid invitation email is required'
      using errcode = '22023';
  end if;

  if normalized_role = 'owner' then
    raise exception 'Owner invitations are not supported'
      using errcode = '22023';
  end if;

  if normalized_role is null or normalized_role not in ('employee', 'accountant') then
    raise exception 'Invitation role must be employee or accountant'
      using errcode = '22023';
  end if;

  update public.company_invitations
  set status = 'expired'
  where company_id = target_company_id
    and email = normalized_email
    and status = 'pending'
    and expires_at <= now();

  if exists (
    select 1
    from public.company_invitations
    where company_id = target_company_id
      and email = normalized_email
      and status = 'pending'
  ) then
    raise exception 'A pending invitation already exists for this email'
      using errcode = '23505';
  end if;

  raw_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  hashed_token := pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex');

  insert into public.company_invitations (
    company_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    target_company_id,
    normalized_email,
    normalized_role,
    hashed_token,
    current_user_id,
    now() + interval '7 days'
  );

  return raw_token;
end;
$$;

create or replace function public.accept_company_invitation(
  invitation_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  normalized_token text := btrim(invitation_token);
  hashed_token text;
  invitation public.company_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  if normalized_token is null or normalized_token = '' then
    raise exception 'A valid invitation token is required'
      using errcode = '22023';
  end if;

  hashed_token := pg_catalog.encode(extensions.digest(normalized_token, 'sha256'), 'hex');

  select *
  into invitation
  from public.company_invitations
  where token_hash = hashed_token
  for update;

  if not found then
    raise exception 'Invitation is invalid'
      using errcode = '22023';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Invitation is no longer pending'
      using errcode = '22023';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'Invitation has expired'
      using errcode = '22023';
  end if;

  select lower(email)
  into current_user_email
  from auth.users
  where id = current_user_id;

  if current_user_email is null or current_user_email <> invitation.email then
    raise exception 'Authenticated email does not match the invitation'
      using errcode = '42501';
  end if;

  insert into public.company_memberships as existing_membership (
    company_id,
    user_id,
    role,
    status
  )
  values (
    invitation.company_id,
    current_user_id,
    invitation.role,
    'active'
  )
  on conflict (company_id, user_id) do update
  set role = case
      when existing_membership.role = 'owner' then 'owner'
      else excluded.role
    end,
    status = 'active',
    updated_at = now();

  update public.company_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = invitation.id;

  return invitation.company_id;
end;
$$;

create or replace function public.revoke_company_invitation(
  invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invitation public.company_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;

  select *
  into invitation
  from public.company_invitations
  where id = invitation_id
  for update;

  if not found then
    raise exception 'Invitation was not found'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.company_memberships
    where company_id = invitation.company_id
      and user_id = current_user_id
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'An active company owner is required'
      using errcode = '42501';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Only pending invitations can be revoked'
      using errcode = '22023';
  end if;

  update public.company_invitations
  set status = 'revoked'
  where id = invitation.id;
end;
$$;

revoke all on function public.create_company_invitation(uuid, text, text) from public, anon;
revoke all on function public.accept_company_invitation(text) from public, anon;
revoke all on function public.revoke_company_invitation(uuid) from public, anon;

grant execute on function public.create_company_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_company_invitation(text) to authenticated;
grant execute on function public.revoke_company_invitation(uuid) to authenticated;
