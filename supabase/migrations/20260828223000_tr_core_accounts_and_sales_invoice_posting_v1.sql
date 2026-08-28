-- Octo TR Accounting Pack + Sales Invoice -> GL Posting V1
-- Keeps Turkish localization outside the universal accounting kernel.
-- V1 posts only same-base-currency internal sales invoices.

create or replace function public.ensure_tr_accounting_system_account(
  target_company_id uuid,
  account_code text,
  account_name text,
  account_type_value text,
  normal_balance_value text,
  account_system_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  existing public.accounting_accounts%rowtype;
  created_id uuid;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  if nullif(btrim(account_code), '') is null
    or nullif(btrim(account_name), '') is null
    or nullif(btrim(account_system_key), '') is null then
    raise exception 'TR accounting system account fields are required' using errcode = '22023';
  end if;

  if account_type_value not in ('asset','liability','equity','revenue','expense')
    or normal_balance_value not in ('debit','credit') then
    raise exception 'TR accounting system account classification is invalid' using errcode = '22023';
  end if;

  select * into existing
  from public.accounting_accounts a
  where a.company_id = target_company_id
    and a.system_key = lower(btrim(account_system_key))
  limit 1;

  if found then
    if existing.account_type <> account_type_value or existing.normal_balance <> normal_balance_value then
      raise exception 'Existing system account classification conflicts with TR pack' using errcode = '23514';
    end if;
    return existing.id;
  end if;

  select * into existing
  from public.accounting_accounts a
  where a.company_id = target_company_id
    and a.code = btrim(account_code)
  limit 1;

  if found then
    if existing.account_type <> account_type_value or existing.normal_balance <> normal_balance_value then
      raise exception 'Existing account code classification conflicts with TR pack' using errcode = '23514';
    end if;
    if existing.system_key is not null and existing.system_key <> lower(btrim(account_system_key)) then
      raise exception 'Existing account code is already assigned to another system role' using errcode = '23514';
    end if;

    update public.accounting_accounts
    set system_key = lower(btrim(account_system_key)),
        name = account_name,
        is_active = true,
        updated_by = actor_id,
        updated_at = now()
    where id = existing.id
    returning id into created_id;
    return created_id;
  end if;

  insert into public.accounting_accounts(
    company_id,
    code,
    name,
    account_type,
    normal_balance,
    system_key,
    allow_posting,
    is_active,
    created_by,
    updated_by
  ) values (
    target_company_id,
    btrim(account_code),
    btrim(account_name),
    account_type_value,
    normal_balance_value,
    lower(btrim(account_system_key)),
    true,
    true,
    actor_id,
    actor_id
  ) returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.initialize_tr_accounting_core(target_company_id uuid)
returns table(system_key text, account_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  receivable_id uuid;
  sales_id uuid;
  vat_id uuid;
  other_tax_id uuid;
  cash_id uuid;
  bank_id uuid;
begin
  if auth.uid() is null or not public.is_company_operator(target_company_id) then
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

  return query values
    ('trade_receivables'::text, receivable_id),
    ('sales_revenue'::text, sales_id),
    ('vat_payable'::text, vat_id),
    ('sales_other_tax_payable'::text, other_tax_id),
    ('cash_on_hand'::text, cash_id),
    ('bank_cash'::text, bank_id);
end;
$$;

create or replace function public.post_sales_invoice_to_accounting(
  target_company_id uuid,
  target_invoice_id uuid
)
returns public.accounting_journal_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  invoice_row public.finance_invoices%rowtype;
  company_currency text;
  receivable_account uuid;
  revenue_account uuid;
  vat_account uuid;
  other_tax_account uuid;
  revenue_amount numeric(18,2);
  existing_entry public.accounting_journal_entries%rowtype;
  entry_id uuid;
  lines jsonb;
  snapshot jsonb;
  posted_entry public.accounting_journal_entries%rowtype;
begin
  if actor_id is null or not public.is_company_operator(target_company_id) then
    raise exception 'Operator access is required' using errcode = '42501';
  end if;

  select * into invoice_row
  from public.finance_invoices i
  where i.id = target_invoice_id
    and i.company_id = target_company_id
  for update;

  if not found then
    raise exception 'Finance invoice was not found' using errcode = 'P0002';
  end if;
  if invoice_row.invoice_type <> 'sales' then
    raise exception 'Only sales invoices can use the sales invoice posting workflow' using errcode = '23514';
  end if;
  if invoice_row.status not in ('issued','partially_paid','paid') then
    raise exception 'Sales invoice must be issued before accounting posting' using errcode = '23514';
  end if;
  if invoice_row.archived_at is not null or invoice_row.status = 'cancelled' then
    raise exception 'Cancelled or archived invoice cannot be posted' using errcode = '23514';
  end if;

  select c.base_currency into company_currency
  from public.companies c
  where c.id = target_company_id;

  if company_currency is null then
    raise exception 'Company base currency was not found' using errcode = 'P0002';
  end if;
  if invoice_row.currency <> company_currency then
    raise exception 'Foreign-currency invoice posting requires the FX accounting layer' using errcode = '23514';
  end if;

  revenue_amount := invoice_row.grand_total - invoice_row.tax_total - invoice_row.other_tax_total;
  if revenue_amount < 0 then
    raise exception 'Invoice accounting amounts are inconsistent' using errcode = '23514';
  end if;

  select id into receivable_account
  from public.accounting_accounts
  where company_id = target_company_id and system_key = 'trade_receivables' and is_active and allow_posting;
  select id into revenue_account
  from public.accounting_accounts
  where company_id = target_company_id and system_key = 'sales_revenue' and is_active and allow_posting;

  if receivable_account is null or revenue_account is null then
    raise exception 'TR accounting core is not initialized for this company' using errcode = '23514';
  end if;

  if invoice_row.tax_total > 0 then
    select id into vat_account
    from public.accounting_accounts
    where company_id = target_company_id and system_key = 'vat_payable' and is_active and allow_posting;
    if vat_account is null then
      raise exception 'VAT payable account is not configured' using errcode = '23514';
    end if;
  end if;

  if invoice_row.other_tax_total > 0 then
    select id into other_tax_account
    from public.accounting_accounts
    where company_id = target_company_id and system_key = 'sales_other_tax_payable' and is_active and allow_posting;
    if other_tax_account is null then
      raise exception 'Other sales tax payable account is not configured' using errcode = '23514';
    end if;
  end if;

  select * into existing_entry
  from public.accounting_journal_entries e
  where e.company_id = target_company_id
    and e.source_domain = 'finance'
    and e.source_type = 'sales_invoice'
    and e.source_id = invoice_row.id
  limit 1
  for update;

  if found and existing_entry.status = 'posted' then
    return existing_entry;
  end if;
  if found and existing_entry.status = 'reversed' then
    raise exception 'Sales invoice accounting entry was reversed and cannot be silently reposted' using errcode = '23514';
  end if;

  snapshot := jsonb_build_object(
    'invoice_id', invoice_row.id,
    'invoice_number', invoice_row.invoice_number,
    'party_id', invoice_row.party_id,
    'party_display_name', invoice_row.party_display_name,
    'issue_date', invoice_row.issue_date,
    'due_date', invoice_row.due_date,
    'currency', invoice_row.currency,
    'subtotal', invoice_row.subtotal,
    'discount_total', invoice_row.discount_total,
    'tax_total', invoice_row.tax_total,
    'other_tax_total', invoice_row.other_tax_total,
    'grand_total', invoice_row.grand_total,
    'status_at_posting', invoice_row.status
  );

  if found then
    entry_id := existing_entry.id;
  else
    entry_id := public.create_accounting_journal_entry(
      target_company_id,
      invoice_row.issue_date,
      'Satış faturası ' || invoice_row.invoice_number,
      'finance',
      'sales_invoice',
      invoice_row.id,
      invoice_row.invoice_number,
      snapshot
    );
  end if;

  lines := jsonb_build_array(
    jsonb_build_object(
      'account_id', receivable_account,
      'description', 'Alıcılar - ' || invoice_row.party_display_name,
      'debit', invoice_row.grand_total,
      'credit', 0,
      'party_id', invoice_row.party_id,
      'source_line_ref', invoice_row.invoice_number,
      'metadata', jsonb_build_object('role','trade_receivable')
    ),
    jsonb_build_object(
      'account_id', revenue_account,
      'description', 'Yurtiçi satış geliri',
      'debit', 0,
      'credit', revenue_amount,
      'source_line_ref', invoice_row.invoice_number,
      'metadata', jsonb_build_object('role','sales_revenue')
    )
  );

  if invoice_row.tax_total > 0 then
    lines := lines || jsonb_build_array(
      jsonb_build_object(
        'account_id', vat_account,
        'description', 'Hesaplanan KDV',
        'debit', 0,
        'credit', invoice_row.tax_total,
        'source_line_ref', invoice_row.invoice_number,
        'metadata', jsonb_build_object('role','vat_payable')
      )
    );
  end if;

  if invoice_row.other_tax_total > 0 then
    lines := lines || jsonb_build_array(
      jsonb_build_object(
        'account_id', other_tax_account,
        'description', 'Diğer satış vergileri',
        'debit', 0,
        'credit', invoice_row.other_tax_total,
        'source_line_ref', invoice_row.invoice_number,
        'metadata', jsonb_build_object('role','sales_other_tax_payable')
      )
    );
  end if;

  perform public.replace_accounting_journal_lines(target_company_id, entry_id, lines);
  posted_entry := public.post_accounting_journal_entry(target_company_id, entry_id);
  return posted_entry;
end;
$$;

revoke all on function public.ensure_tr_accounting_system_account(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.initialize_tr_accounting_core(uuid) from public, anon;
revoke all on function public.post_sales_invoice_to_accounting(uuid,uuid) from public, anon;

grant execute on function public.initialize_tr_accounting_core(uuid) to authenticated;
grant execute on function public.post_sales_invoice_to_accounting(uuid,uuid) to authenticated;

comment on function public.initialize_tr_accounting_core(uuid) is
  'Initializes the minimal Turkish system accounts used by Octo accounting workflows without replacing the universal accounting kernel.';
comment on function public.post_sales_invoice_to_accounting(uuid,uuid) is
  'Posts an issued same-base-currency internal Octo sales invoice to the authoritative double-entry ledger with source lineage.';
