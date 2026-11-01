alter table public.budget_items
  add column if not exists account_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
      where conname = 'budget_items_account_id_fkey'
        and conrelid = 'public.budget_items'::regclass
  ) then
    alter table public.budget_items
      add constraint budget_items_account_id_fkey
      foreign key (account_id)
      references public.account_items (id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists budget_items_month_account_unique
  on public.budget_items (month_id, account_id)
  where account_id is not null;

create or replace function public.sync_current_month_total_equity(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month_id uuid;
begin
  if p_user_id is null then
    return;
  end if;

  select month.id
    into v_month_id
    from public.budget_months as budget_month
    where budget_month.user_id = p_user_id
      and budget_month.month_start =
        pg_catalog.date_trunc('month', current_date)::date;

  if v_month_id is null then
    return;
  end if;

  delete from public.budget_items as item
    where item.month_id = v_month_id
      and item.user_id = p_user_id
      and item.section = 'totalEquity';

  insert into public.budget_items (
    month_id,
    user_id,
    section,
    name,
    amount,
    position,
    account_id
  )
  select
    v_month_id,
    p_user_id,
    'totalEquity',
    account.name,
    case
      when account.account_type = 'liability' then -account.amount
      else account.amount
    end,
    (pg_catalog.row_number() over (
      order by account.sort_order, account.id
    ) - 1)::integer,
    account.id
  from public.account_items as account
  where account.user_id = p_user_id;
end;
$$;

revoke all on function public.sync_current_month_total_equity(uuid)
  from public, anon, authenticated;

create or replace function public.create_account_item(
  p_name text,
  p_type text,
  p_category text,
  p_amount numeric
)
returns table (
  id uuid,
  name text,
  account_type text,
  category text,
  amount numeric,
  sort_order integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sort_order integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_name is null
    or pg_catalog.length(pg_catalog.btrim(p_name)) not between 1 and 120
    or p_type is null
    or p_type not in ('asset', 'liability')
    or p_category is null
    or pg_catalog.length(pg_catalog.btrim(p_category)) not between 1 and 100
    or p_amount is null
    or p_amount < 0
    or p_amount > 999999999999.99 then
    raise exception 'Invalid account details' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select coalesce(pg_catalog.max(account.sort_order) + 1, 0)
    into v_sort_order
    from public.account_items as account
    where account.user_id = v_user_id;

  if v_sort_order >= 100 then
    raise exception 'Account limit reached' using errcode = '22023';
  end if;

  return query
    insert into public.account_items as created (
      user_id,
      name,
      account_type,
      category,
      amount,
      sort_order
    )
    values (
      v_user_id,
      pg_catalog.btrim(p_name),
      p_type,
      pg_catalog.btrim(p_category),
      p_amount,
      v_sort_order
    )
    returning
      created.id,
      created.name,
      created.account_type,
      created.category,
      created.amount,
      created.sort_order;

  perform public.sync_current_month_total_equity(v_user_id);
end;
$$;

create or replace function public.save_account_items(p_accounts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account jsonb;
  v_id text;
  v_name text;
  v_type text;
  v_category text;
  v_amount text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_accounts is null
    or pg_catalog.jsonb_typeof(p_accounts) <> 'array'
    or pg_catalog.jsonb_array_length(p_accounts) > 100 then
    raise exception 'Invalid account list' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  for v_account in
    select item.value
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_account) <> 'object'
      or pg_catalog.jsonb_typeof(v_account -> 'id') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'name') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'type') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'category')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'amount')
        is distinct from 'string' then
      raise exception 'Invalid account entry' using errcode = '22023';
    end if;

    v_id := v_account ->> 'id';
    v_name := pg_catalog.btrim(v_account ->> 'name');
    v_type := v_account ->> 'type';
    v_category := pg_catalog.btrim(v_account ->> 'category');
    v_amount := v_account ->> 'amount';

    if v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or pg_catalog.length(v_name) not between 1 and 120
      or v_type not in ('asset', 'liability')
      or pg_catalog.length(v_category) not between 1 and 100
      or v_amount !~ '^[0-9]{1,12}([.][0-9]{1,2})?$' then
      raise exception 'Invalid account details' using errcode = '22023';
    end if;
  end loop;

  if exists (
    select item.value ->> 'id'
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
      group by item.value ->> 'id'
      having pg_catalog.count(*) > 1
  ) then
    raise exception 'Duplicate account id' using errcode = '22023';
  end if;

  if exists (
    select 1
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
      where not exists (
        select 1
          from public.account_items as account
          where account.user_id = v_user_id
            and account.id = (item.value ->> 'id')::uuid
      )
  ) then
    raise exception 'Account not found' using errcode = '22023';
  end if;

  update public.account_items as account
    set
      name = pg_catalog.btrim(item.value ->> 'name'),
      account_type = item.value ->> 'type',
      category = pg_catalog.btrim(item.value ->> 'category'),
      amount = (item.value ->> 'amount')::numeric,
      sort_order = (item.ordinality - 1)::integer
    from pg_catalog.jsonb_array_elements(p_accounts)
      with ordinality as item(value, ordinality)
    where account.user_id = v_user_id
      and account.id = (item.value ->> 'id')::uuid;

  delete from public.account_items as account
    where account.user_id = v_user_id
      and not exists (
        select 1
          from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
          where (item.value ->> 'id')::uuid = account.id
      );

  perform public.sync_current_month_total_equity(v_user_id);
end;
$$;

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
      position
    )
    select
      v_new_month_id,
      v_user_id,
      item.section,
      item.name,
      item.amount,
      item.position
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
  v_account_count integer;
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

  select bm.id
    into v_month_id
    from public.budget_months as bm
    where bm.user_id = v_user_id
      and bm.month_start = p_month_start;

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
        or pg_catalog.jsonb_typeof(v_item -> 'item') <> 'string'
        or pg_catalog.jsonb_typeof(v_item -> 'amount') <> 'string' then
        raise exception 'Invalid budget entry' using errcode = '22023';
      end if;

      if v_item ? 'accountId'
        and (v_section <> 'totalEquity' or not v_is_current_month) then
        raise exception 'Account links are only valid for current equity'
          using errcode = '22023';
      end if;

      if v_section = 'totalEquity' and v_is_current_month
        and (
          pg_catalog.jsonb_typeof(v_item -> 'accountId')
            is distinct from 'string'
          or (v_item ->> 'accountId') !~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) then
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
    select pg_catalog.count(*)::integer
      into v_account_count
      from public.account_items as account
      where account.user_id = v_user_id;

    select pg_catalog.count(distinct entry.value ->> 'accountId')::integer
      into v_linked_account_count
      from pg_catalog.jsonb_array_elements(
        p_budget -> 'totalEquity'
      ) as entry(value);

    if pg_catalog.jsonb_array_length(p_budget -> 'totalEquity')
      <> v_account_count
      or v_linked_account_count <> v_account_count then
      raise exception 'Current equity must include every account exactly once'
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
  end if;

  delete from public.budget_items as bi
    where bi.month_id = v_month_id
      and bi.user_id = v_user_id;

  insert into public.budget_items (
    month_id,
    user_id,
    section,
    name,
    amount,
    position,
    account_id
  )
  select
    v_month_id,
    v_user_id,
    section_data.section,
    pg_catalog.btrim(item.value ->> 'item'),
    (item.value ->> 'amount')::numeric,
    (item.ordinality - 1)::integer,
    case
      when v_is_current_month and section_data.section = 'totalEquity'
        then (item.value ->> 'accountId')::uuid
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
  ) with ordinality as item(value, ordinality);

  if v_is_current_month then
    perform public.sync_current_month_total_equity(v_user_id);
  end if;
end;
$$;

revoke all on function public.create_account_item(text, text, text, numeric)
  from public, anon;
revoke all on function public.save_account_items(jsonb) from public, anon;
revoke all on function public.create_next_budget_month(text) from public, anon;
revoke all on function public.save_budget_month(date, jsonb) from public, anon;
grant execute on function public.create_account_item(text, text, text, numeric)
  to authenticated;
grant execute on function public.save_account_items(jsonb) to authenticated;
grant execute on function public.create_next_budget_month(text) to authenticated;
grant execute on function public.save_budget_month(date, jsonb) to authenticated;
