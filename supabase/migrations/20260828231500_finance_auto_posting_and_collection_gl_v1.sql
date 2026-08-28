-- Octo Finance -> Accounting Auto Posting + Customer Collection GL V1
-- Keeps existing Finance RPC signatures stable while making accounting integration opt-in per company.
-- When enabled, finance mutations and ledger postings commit atomically in the same database transaction.

create table public.accounting_company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  enabled boolean not null default false,
  auto_post_operational_events boolean not null default true,
  jurisdiction_code text not null default 'TR' check (char_length(btrim(jurisdiction_code)) > 0),
  initialized_at timestamptz,
  initialized_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.accounting_company_settings enable row level security;
revoke all on table public.accounting_company_settings from public, anon, authenticated;
grant select on table public.accounting_company_settings to authenticated;

create policy accounting_company_settings_read
on public.accounting_company_settings
for select to authenticated
using (public.is_company_member(company_id));

create or replace function public.initialize_tr_accounting_core(target_company_id uuid)
returns table(system_key text, account_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  receivable_id uuid;
  sales_id uuid;
  vat_id uuid;
  other_tax_id uuid;
  cash_id uuid;
  bank_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  receivable_id := public.ensure_tr_accounting_system_account(
    target_company_id, '120', 'Alıcılar', 'asset', 'debit', 'trade_receivables'
  );
  sales_id := public.ensure_tr_accounting_system_account(
    target_company_id, '600', 'Yurtiçi Satışlar', 'revenue', 'credit', 'sales_revenue'
  );
  vat_id := public.ensure_tr_accounting_system_account(
    target_company_id, '391', 'Hesaplanan KDV', 'liability', 'credit', 'vat_payable'
  );
  other_tax_id := public.ensure_tr_accounting_system_account(
    target_company_id, '360', 'Ödenecek Vergi ve Fonlar', 'liability', 'credit', 'sales_other_tax_payable'
  );
  cash_id := public.ensure_tr_accounting_system_account(
    target_company_id, '100', 'Kasa', 'asset', 'debit', 'cash_on_hand'
  );
  bank_id := public.ensure_tr_accounting_system_account(
    target_company_id, '102', 'Bankalar', 'asset', 'debit', 'bank_cash'
  );

  insert into public.accounting_company_settings(
    company_id, enabled, auto_post_operational_events, jurisdiction_code, initialized_at, initialized_by, updated_at
  ) values (
    target_company_id, true, true, 'TR', now(), actor_id, now()
  )
  on conflict(company_id) do update
  set enabled = true,
      jurisdiction_code = 'TR',
      initialized_at = coalesce(public.accounting_company_settings.initialized_at, now()),
      initialized_by = coalesce(public.accounting_company_settings.initialized_by, actor_id),
      updated_at = now();

  return query values
    ('trade_receivables'::text, receivable_id),
    ('sales_revenue'::text, sales_id),
    ('vat_payable'::text, vat_id),
    ('sales_other_tax_payable'::text, other_tax_id),
    ('cash_on_hand'::text, cash_id),
    ('bank_cash'::text, bank_id);
end;
$$;

create or replace function public.post_customer_collection_to_accounting(
  target_company_id uuid,
  target_payment_id uuid
)
returns public.accounting_journal_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  payment_row public.finance_payments%rowtype;
  finance_account_row public.finance_accounts%rowtype;
  company_currency text;
  cash_account uuid;
  receivable_account uuid;
  allocation_total numeric(18,2);
  allocation_count integer;
  allocation_row record;
  existing_entry public.accounting_journal_entries%rowtype;
  entry_id uuid;
  lines jsonb;
  snapshot jsonb;
  posted_entry public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  select * into payment_row
  from public.finance_payments p
  where p.id = target_payment_id
    and p.company_id = target_company_id
  for update;

  if not found then
    raise exception 'Finance payment was not found' using errcode = 'P0002';
  end if;
  if payment_row.direction <> 'inflow' then
    raise exception 'Only customer collections can use this accounting posting workflow' using errcode = '23514';
  end if;

  select * into finance_account_row
  from public.finance_accounts a
  where a.id = payment_row.account_id
    and a.company_id = target_company_id;

  if not found or finance_account_row.archived_at is not null then
    raise exception 'Finance account was not found or is archived' using errcode = '23514';
  end if;

  select c.base_currency into company_currency
  from public.companies c
  where c.id = target_company_id;

  if company_currency is null then
    raise exception 'Company base currency was not found' using errcode = 'P0002';
  end if;
  if payment_row.currency <> company_currency or finance_account_row.currency <> company_currency then
    raise exception 'Foreign-currency collection posting requires the FX accounting layer' using errcode = '23514';
  end if;

  select count(*), coalesce(sum(a.allocated_amount), 0)
    into allocation_count, allocation_total
  from public.finance_payment_allocations a
  where a.company_id = target_company_id
    and a.payment_id = payment_row.id;

  if allocation_count = 0 or allocation_total <> payment_row.amount then
    raise exception 'Customer collection allocations must exactly equal the payment amount' using errcode = '23514';
  end if;

  -- Ensure every receivable being cleared already exists in accounting truth.
  -- This also handles invoices issued before auto-posting was enabled.
  for allocation_row in
    select a.invoice_id
    from public.finance_payment_allocations a
    join public.finance_invoices i
      on i.id = a.invoice_id and i.company_id = a.company_id
    where a.company_id = target_company_id
      and a.payment_id = payment_row.id
    order by a.invoice_id
  loop
    perform public.post_sales_invoice_to_accounting(target_company_id, allocation_row.invoice_id);
  end loop;

  select id into receivable_account
  from public.accounting_accounts
  where company_id = target_company_id
    and system_key = 'trade_receivables'
    and is_active
    and allow_posting;

  if finance_account_row.account_type = 'bank' then
    select id into cash_account
    from public.accounting_accounts
    where company_id = target_company_id
      and system_key = 'bank_cash'
      and is_active
      and allow_posting;
  elsif finance_account_row.account_type = 'cash' then
    select id into cash_account
    from public.accounting_accounts
    where company_id = target_company_id
      and system_key = 'cash_on_hand'
      and is_active
      and allow_posting;
  else
    raise exception 'Unsupported finance account type for customer collection' using errcode = '23514';
  end if;

  if receivable_account is null or cash_account is null then
    raise exception 'TR accounting core is not initialized for this company' using errcode = '23514';
  end if;

  select * into existing_entry
  from public.accounting_journal_entries e
  where e.company_id = target_company_id
    and e.source_domain = 'finance'
    and e.source_type = 'customer_collection'
    and e.source_id = payment_row.id
  limit 1
  for update;

  if found and existing_entry.status = 'posted' then
    return existing_entry;
  end if;
  if found and existing_entry.status = 'reversed' then
    raise exception 'Customer collection accounting entry was reversed and cannot be silently reposted' using errcode = '23514';
  end if;

  snapshot := jsonb_build_object(
    'payment_id', payment_row.id,
    'payment_number', payment_row.payment_number,
    'party_id', payment_row.party_id,
    'finance_account_id', payment_row.account_id,
    'finance_account_name', finance_account_row.name,
    'finance_account_type', finance_account_row.account_type,
    'payment_date', payment_row.payment_date,
    'currency', payment_row.currency,
    'amount', payment_row.amount,
    'payment_method', payment_row.payment_method,
    'external_reference', payment_row.external_reference,
    'allocations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'invoice_id', i.id,
          'invoice_number', i.invoice_number,
          'allocated_amount', a.allocated_amount
        ) order by i.invoice_number
      )
      from public.finance_payment_allocations a
      join public.finance_invoices i
        on i.id = a.invoice_id and i.company_id = a.company_id
      where a.company_id = target_company_id
        and a.payment_id = payment_row.id
    ), '[]'::jsonb)
  );

  if found then
    entry_id := existing_entry.id;
  else
    entry_id := public.create_accounting_journal_entry(
      target_company_id,
      payment_row.payment_date,
      'Müşteri tahsilatı ' || payment_row.payment_number,
      'finance',
      'customer_collection',
      payment_row.id,
      payment_row.payment_number,
      snapshot
    );
  end if;

  lines := jsonb_build_array(
    jsonb_build_object(
      'account_id', cash_account,
      'description', case finance_account_row.account_type
        when 'bank' then 'Banka tahsilatı - ' || finance_account_row.name
        else 'Nakit tahsilat - ' || finance_account_row.name
      end,
      'debit', payment_row.amount,
      'credit', 0,
      'party_id', payment_row.party_id,
      'source_line_ref', payment_row.payment_number,
      'metadata', jsonb_build_object(
        'role', case finance_account_row.account_type when 'bank' then 'bank_cash' else 'cash_on_hand' end,
        'finance_account_id', finance_account_row.id,
        'payment_method', payment_row.payment_method
      )
    ),
    jsonb_build_object(
      'account_id', receivable_account,
      'description', 'Alıcılar tahsilatı',
      'debit', 0,
      'credit', payment_row.amount,
      'party_id', payment_row.party_id,
      'source_line_ref', payment_row.payment_number,
      'metadata', jsonb_build_object(
        'role', 'trade_receivable_clearance',
        'allocation_count', allocation_count
      )
    )
  );

  perform public.replace_accounting_journal_lines(target_company_id, entry_id, lines);
  posted_entry := public.post_accounting_journal_entry(target_company_id, entry_id);
  return posted_entry;
end;
$$;

-- Replaces the existing Finance lifecycle RPC with the same signature.
-- Accounting behavior is gated by accounting_company_settings, so non-accounting companies are unaffected.
create or replace function public.transition_finance_invoice_status(
  target_company_id uuid,
  target_invoice_id uuid,
  destination_status text,
  transition_reason text default null
)
returns public.finance_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  invoice_row public.finance_invoices%rowtype;
  updated_row public.finance_invoices%rowtype;
  valid boolean;
  auto_post_enabled boolean := false;
  accounting_entry public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  select * into invoice_row
  from public.finance_invoices fi
  where fi.id = target_invoice_id and fi.company_id = target_company_id
  for update;

  if not found then raise exception 'Finance invoice was not found' using errcode = 'P0002'; end if;
  if invoice_row.archived_at is not null then raise exception 'Archived invoice cannot transition' using errcode = '23514'; end if;

  valid := case invoice_row.status
    when 'draft' then destination_status in ('issued','cancelled')
    when 'issued' then destination_status = 'cancelled'
    else false
  end;
  if not valid then raise exception 'Invalid invoice status transition' using errcode = '23514'; end if;
  if destination_status = 'issued' and invoice_row.due_date is null then raise exception 'Invoice due date is required before issue' using errcode = '23514'; end if;
  if destination_status = 'cancelled' and nullif(btrim(transition_reason), '') is null then raise exception 'Cancellation reason is required' using errcode = '22023'; end if;
  if destination_status = 'cancelled' and exists(select 1 from public.finance_payment_allocations a where a.invoice_id = invoice_row.id) then
    raise exception 'Invoice with payment allocations cannot be cancelled' using errcode = '23514';
  end if;

  select coalesce(s.enabled and s.auto_post_operational_events, false)
    into auto_post_enabled
  from public.accounting_company_settings s
  where s.company_id = target_company_id;
  auto_post_enabled := coalesce(auto_post_enabled, false);

  perform set_config('octo.finance_invoice_controlled_update', 'on', true);
  update public.finance_invoices
  set status = destination_status,
      issued_at = case when destination_status = 'issued' then now() else issued_at end,
      cancelled_at = case when destination_status = 'cancelled' then now() else null end,
      cancellation_reason = case when destination_status = 'cancelled' then nullif(btrim(transition_reason), '') else null end
  where id = invoice_row.id
  returning * into updated_row;
  perform set_config('octo.finance_invoice_controlled_update', '', true);

  insert into public.finance_invoice_status_history(company_id, invoice_id, from_status, to_status, changed_by, reason)
  values(target_company_id, invoice_row.id, invoice_row.status, destination_status, actor_id, nullif(btrim(transition_reason), ''));

  if auto_post_enabled and destination_status = 'issued' then
    perform public.post_sales_invoice_to_accounting(target_company_id, target_invoice_id);
  elsif auto_post_enabled and destination_status = 'cancelled' then
    select * into accounting_entry
    from public.accounting_journal_entries e
    where e.company_id = target_company_id
      and e.source_domain = 'finance'
      and e.source_type = 'sales_invoice'
      and e.source_id = target_invoice_id
      and e.status = 'posted'
    limit 1;

    if found then
      perform public.reverse_accounting_journal_entry(
        target_company_id,
        accounting_entry.id,
        current_date,
        'Satış faturası iptali: ' || coalesce(nullif(btrim(transition_reason), ''), 'neden belirtilmedi')
      );
    end if;
  end if;

  return updated_row;
end;
$$;

-- Replaces the existing collection RPC with the same signature and return shape.
-- When accounting auto-post is enabled, collection + invoice catch-up posting + collection posting are atomic.
create or replace function public.record_customer_collection(
  target_company_id uuid,
  target_party_id uuid,
  target_account_id uuid,
  requested_payment_date date,
  requested_payment_method text,
  requested_external_reference text default null,
  requested_note text default null,
  allocations jsonb default '[]'::jsonb
)
returns table(payment_id uuid, payment_number text, amount numeric, affected_invoices jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  account_row public.finance_accounts%rowtype;
  invoice_row public.finance_invoices%rowtype;
  allocation jsonb;
  common_currency text;
  total_amount numeric(18,2) := 0;
  allocation_amount numeric(18,2);
  created_id uuid;
  created_number text;
  results jsonb := '[]'::jsonb;
  next_status text;
  auto_post_enabled boolean := false;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;
  if requested_payment_date is null or jsonb_typeof(allocations) <> 'array' or jsonb_array_length(allocations) = 0 then
    raise exception 'At least one payment allocation is required' using errcode = '22023';
  end if;
  if exists(
    select 1
    from (
      select value->>'invoice_id' id, count(*)
      from jsonb_array_elements(allocations)
      group by value->>'invoice_id'
      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Allocation invoice IDs must be unique' using errcode = '22023';
  end if;

  select * into account_row
  from public.finance_accounts a
  where a.id = target_account_id and a.company_id = target_company_id and a.archived_at is null
  for update;
  if not found then raise exception 'Active finance account was not found' using errcode = 'P0002'; end if;

  for allocation in select value from jsonb_array_elements(allocations) order by value->>'invoice_id' loop
    allocation_amount := (allocation->>'allocated_amount')::numeric;
    if allocation_amount is null or allocation_amount <= 0 then raise exception 'Allocated amount must be greater than zero' using errcode = '22023'; end if;

    select * into invoice_row
    from public.finance_invoices fi
    where fi.id = (allocation->>'invoice_id')::uuid and fi.company_id = target_company_id
    for update;

    if not found or invoice_row.party_id <> target_party_id then
      raise exception 'Collection invoice must belong to selected party and company' using errcode = '23514';
    end if;
    if invoice_row.status not in ('issued','partially_paid') or invoice_row.archived_at is not null then
      raise exception 'Only active issued invoices can receive collections' using errcode = '23514';
    end if;
    if common_currency is null then
      common_currency := invoice_row.currency;
    elsif common_currency <> invoice_row.currency then
      raise exception 'Collection invoices must use one currency' using errcode = '23514';
    end if;
    if allocation_amount > invoice_row.outstanding_amount then
      raise exception 'Allocation exceeds invoice outstanding amount' using errcode = '23514';
    end if;
    total_amount := total_amount + allocation_amount;
  end loop;

  if account_row.currency <> common_currency then
    raise exception 'Finance account currency must match invoice currency' using errcode = '23514';
  end if;

  created_number := public.next_finance_document_number(target_company_id, 'customer_receipt', requested_payment_date);
  insert into public.finance_payments(
    company_id, payment_number, direction, party_id, account_id, payment_date, currency, amount,
    payment_method, external_reference, note, created_by
  ) values (
    target_company_id, created_number, 'inflow', target_party_id, target_account_id, requested_payment_date,
    common_currency, total_amount, requested_payment_method, requested_external_reference, requested_note, actor_id
  ) returning id into created_id;

  for allocation in select value from jsonb_array_elements(allocations) order by value->>'invoice_id' loop
    allocation_amount := (allocation->>'allocated_amount')::numeric;
    select * into invoice_row
    from public.finance_invoices fi
    where fi.id = (allocation->>'invoice_id')::uuid and fi.company_id = target_company_id
    for update;

    insert into public.finance_payment_allocations(company_id, payment_id, invoice_id, allocated_amount)
    values(target_company_id, created_id, invoice_row.id, allocation_amount);

    next_status := case when invoice_row.outstanding_amount - allocation_amount = 0 then 'paid' else 'partially_paid' end;
    perform set_config('octo.finance_invoice_controlled_update', 'on', true);
    update public.finance_invoices
    set paid_amount = paid_amount + allocation_amount,
        outstanding_amount = outstanding_amount - allocation_amount,
        status = next_status,
        paid_at = case when next_status = 'paid' then now() else null end
    where id = invoice_row.id;
    perform set_config('octo.finance_invoice_controlled_update', '', true);

    if invoice_row.status <> next_status then
      insert into public.finance_invoice_status_history(company_id, invoice_id, from_status, to_status, changed_by, reason)
      values(target_company_id, invoice_row.id, invoice_row.status, next_status, actor_id, 'Customer collection allocated');
    end if;
    results := results || jsonb_build_array(jsonb_build_object('invoice_id', invoice_row.id, 'status', next_status));
  end loop;

  select coalesce(s.enabled and s.auto_post_operational_events, false)
    into auto_post_enabled
  from public.accounting_company_settings s
  where s.company_id = target_company_id;
  auto_post_enabled := coalesce(auto_post_enabled, false);

  if auto_post_enabled then
    perform public.post_customer_collection_to_accounting(target_company_id, created_id);
  end if;

  return query select created_id, created_number, total_amount, results;
end;
$$;

revoke all on function public.post_customer_collection_to_accounting(uuid,uuid) from public, anon;
grant execute on function public.post_customer_collection_to_accounting(uuid,uuid) to authenticated;

-- Existing grants on replaced RPCs are preserved by CREATE OR REPLACE, but state them explicitly.
grant execute on function public.transition_finance_invoice_status(uuid,uuid,text,text) to authenticated;
grant execute on function public.record_customer_collection(uuid,uuid,uuid,date,text,text,text,jsonb) to authenticated;

comment on table public.accounting_company_settings is
  'Company-level accounting activation and operational-event auto-posting gate. Finance remains usable when accounting is not enabled.';
comment on function public.post_customer_collection_to_accounting(uuid,uuid) is
  'Posts a same-base-currency customer collection as Dr Bank/Cash and Cr Trade Receivables with exact payment/invoice allocation lineage.';
