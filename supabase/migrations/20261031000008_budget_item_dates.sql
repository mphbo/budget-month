alter table public.budget_items
  add column if not exists scheduled_date date;

create or replace function public.save_budget_month(
  p_month_start date,
  p_budget jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_id uuid;
  v_is_current_month boolean;
  v_section text;
  v_entries jsonb;
  v_item jsonb;
  v_name text;
  v_amount_text text;
  v_account_id uuid;
  v_account_name text;
  v_account_type text;
  v_account_amount numeric;
  v_total_equity_count integer;
  v_linked_account_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if p_month_start is null
    or p_month_start <> pg_catalog.date_trunc('month', p_month_start)::date then
    raise exception 'Invalid month' using errcode = '22023';
  end if;

  if p_budget is null or pg_catalog.jsonb_typeof(p_budget) <> 'object' then
    raise exception 'Invalid budget payload' using errcode = '22023';
  end if;

  select budget_month.id
    into v_month_id
    from public.budget_months as budget_month
    where budget_month.user_id = v_user_id
      and budget_month.month_start = p_month_start;

  if v_month_id is null then
    raise exception 'Month not found' using errcode = 'P0002';
  end if;

  v_is_current_month :=
    p_month_start = pg_catalog.date_trunc('month', current_date)::date;

  foreach v_section in array array[
    'income',
    'expenses',
    'equityChange',
    'totalEquity'
  ]
  loop
    v_entries := p_budget -> v_section;
    if v_entries is null
      or pg_catalog.jsonb_typeof(v_entries) <> 'array'
      or pg_catalog.jsonb_array_length(v_entries) > 100 then
      raise exception 'Invalid entries for section %', v_section
        using errcode = '22023';
    end if;

    for v_item in
      select entry.value
        from pg_catalog.jsonb_array_elements(v_entries) as entry(value)
    loop
      if pg_catalog.jsonb_typeof(v_item) <> 'object'
        or pg_catalog.jsonb_typeof(v_item -> 'item') is distinct from 'string'
        or pg_catalog.jsonb_typeof(v_item -> 'amount')
          is distinct from 'string' then
        raise exception 'Invalid budget entry' using errcode = '22023';
      end if;

      if v_item ? 'date' and v_section not in ('income', 'expenses') then
        raise exception 'Dates are only valid for income and expenses'
          using errcode = '22023';
      end if;

      if v_item ? 'date'
        and (
          pg_catalog.jsonb_typeof(v_item -> 'date')
            is distinct from 'string'
          or (v_item ->> 'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or (v_item ->> 'date') < '0001-01-01'
        ) then
        raise exception 'Invalid budget item date' using errcode = '22023';
      end if;

      if v_item ? 'accountId' and v_section <> 'totalEquity' then
        raise exception 'Account links are only valid for total equity'
          using errcode = '22023';
      end if;

      if v_section = 'totalEquity' and v_item ? 'accountId'
        and (
          pg_catalog.jsonb_typeof(v_item -> 'accountId')
            is distinct from 'string'
          or (v_item ->> 'accountId') !~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) then
        raise exception 'Equity account links must be UUIDs'
          using errcode = '22023';
      end if;

      if v_section = 'totalEquity' and v_is_current_month
        and not (v_item ? 'accountId') then
        raise exception 'Current equity rows must link to an account'
          using errcode = '22023';
      end if;

      v_name := pg_catalog.btrim(v_item ->> 'item');
      v_amount_text := v_item ->> 'amount';
      if pg_catalog.length(v_name) = 0
        or pg_catalog.length(v_name) > 200
        or v_amount_text !~ '^-?[0-9]{1,12}([.][0-9]{1,2})?$' then
        raise exception 'Invalid budget entry values' using errcode = '22023';
      end if;
    end loop;
  end loop;

  if v_is_current_month then
    select pg_catalog.jsonb_array_length(p_budget -> 'totalEquity')
      into v_total_equity_count;

    select pg_catalog.count(
      distinct (entry.value ->> 'accountId')::uuid
    )::integer
      into v_linked_account_count
      from pg_catalog.jsonb_array_elements(
        p_budget -> 'totalEquity'
      ) as entry(value);

    if v_linked_account_count <> v_total_equity_count then
      raise exception 'Current equity contains duplicate accounts'
        using errcode = '22023';
    end if;

    for v_item in
      select entry.value
        from pg_catalog.jsonb_array_elements(
          p_budget -> 'totalEquity'
        ) as entry(value)
    loop
      v_account_id := (v_item ->> 'accountId')::uuid;

      select account.name, account.account_type
        into v_account_name, v_account_type
        from public.account_items as account
        where account.id = v_account_id
          and account.user_id = v_user_id;

      if not found or pg_catalog.btrim(v_item ->> 'item') <> v_account_name then
        raise exception 'Current equity account does not match'
          using errcode = '22023';
      end if;

      v_account_amount := (v_item ->> 'amount')::numeric;
      if (v_account_type = 'asset' and v_account_amount < 0)
        or (v_account_type = 'liability' and v_account_amount > 0) then
        raise exception
          'Assets must be non-negative and liabilities must be negative'
          using errcode = '22023';
      end if;

      update public.account_items as account
        set amount = pg_catalog.abs(v_account_amount)
        where account.id = v_account_id
          and account.user_id = v_user_id;
    end loop;

    delete from public.account_items as account
      where account.user_id = v_user_id
        and not exists (
          select 1
            from pg_catalog.jsonb_array_elements(
              p_budget -> 'totalEquity'
            ) as entry(value)
            where (entry.value ->> 'accountId')::uuid = account.id
        );
  end if;

  delete from public.budget_items as item
    where item.month_id = v_month_id
      and item.user_id = v_user_id;

  insert into public.budget_items (
    month_id,
    user_id,
    section,
    name,
    amount,
    position,
    account_id,
    scheduled_date
  )
  select
    v_month_id,
    v_user_id,
    section_data.section,
    pg_catalog.btrim(entry.value ->> 'item'),
    (entry.value ->> 'amount')::numeric,
    (entry.ordinality - 1)::integer,
    case
      when section_data.section = 'totalEquity'
        and entry.value ? 'accountId'
        then (entry.value ->> 'accountId')::uuid
      else null
    end,
    case
      when section_data.section in ('income', 'expenses')
        and entry.value ? 'date'
        then (entry.value ->> 'date')::date
      else null
    end
  from pg_catalog.unnest(array[
    'income',
    'expenses',
    'equityChange',
    'totalEquity'
  ]) as section_data(section)
  cross join lateral pg_catalog.jsonb_array_elements(
    p_budget -> section_data.section
  ) with ordinality as entry(value, ordinality);

  if v_is_current_month then
    perform public.sync_current_month_total_equity(v_user_id);
  end if;
end;
$$;

revoke all on function public.save_budget_month(date, jsonb)
  from public, anon;
grant execute on function public.save_budget_month(date, jsonb)
  to authenticated;

create or replace function public.create_next_budget_month(p_mode text)
returns table (month_id uuid, month_start date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_month_id uuid;
  v_previous_month_start date;
  v_next_month_start date;
  v_new_month_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_mode is null or p_mode not in ('copy', 'fresh') then
    raise exception 'Invalid month creation mode';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select bm.id, bm.month_start
    into v_previous_month_id, v_previous_month_start
    from public.budget_months as bm
    where bm.user_id = v_user_id
    order by bm.month_start desc
    limit 1
    for update;

  if v_previous_month_id is null then
    v_next_month_start :=
      pg_catalog.date_trunc('month', current_date)::date;
  else
    v_next_month_start := (v_previous_month_start + interval '1 month')::date;
  end if;

  insert into public.budget_months (user_id, month_start)
    values (v_user_id, v_next_month_start)
    returning id into v_new_month_id;

  if p_mode = 'copy' and v_previous_month_id is not null then
    insert into public.budget_items (
      month_id,
      user_id,
      section,
      name,
      amount,
      position,
      scheduled_date
    )
    select
      v_new_month_id,
      v_user_id,
      item.section,
      item.name,
      item.amount,
      item.position,
      item.scheduled_date
    from public.budget_items as item
    where item.month_id = v_previous_month_id
      and item.user_id = v_user_id;
  end if;

  perform public.sync_current_month_total_equity(v_user_id);

  month_id := v_new_month_id;
  month_start := v_next_month_start;
  return next;
end;
$$;

create or replace function public.create_previous_budget_month(p_mode text)
returns table (month_id uuid, month_start date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_earliest_month_id uuid;
  v_earliest_month_start date;
  v_previous_month_start date;
  v_new_month_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_mode is null or p_mode not in ('copy', 'fresh') then
    raise exception 'Invalid month creation mode';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select bm.id, bm.month_start
    into v_earliest_month_id, v_earliest_month_start
    from public.budget_months as bm
    where bm.user_id = v_user_id
    order by bm.month_start asc
    limit 1
    for update;

  if v_earliest_month_id is null then
    raise exception 'Cannot create a previous month before the first month';
  end if;

  v_previous_month_start :=
    (v_earliest_month_start - interval '1 month')::date;

  insert into public.budget_months (user_id, month_start)
    values (v_user_id, v_previous_month_start)
    returning id into v_new_month_id;

  if p_mode = 'copy' then
    insert into public.budget_items (
      month_id,
      user_id,
      section,
      name,
      amount,
      position,
      account_id,
      scheduled_date
    )
    select
      v_new_month_id,
      v_user_id,
      item.section,
      item.name,
      item.amount,
      item.position,
      item.account_id,
      item.scheduled_date
    from public.budget_items as item
    where item.month_id = v_earliest_month_id
      and item.user_id = v_user_id;
  end if;

  perform public.sync_current_month_total_equity(v_user_id);

  month_id := v_new_month_id;
  month_start := v_previous_month_start;
  return next;
end;
$$;

revoke all on function public.create_next_budget_month(text) from public, anon;
revoke all on function public.create_previous_budget_month(text)
  from public, anon;
grant execute on function public.create_next_budget_month(text)
  to authenticated;
grant execute on function public.create_previous_budget_month(text)
  to authenticated;
