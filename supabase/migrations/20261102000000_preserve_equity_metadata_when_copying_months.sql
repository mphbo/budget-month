update public.budget_items as copied
  set account_id = previous_item.account_id,
      account_type = coalesce(copied.account_type, previous_item.account_type),
      category = coalesce(copied.category, previous_item.category)
  from public.budget_months as copied_month
  join public.budget_months as previous_month
    on previous_month.user_id = copied_month.user_id
    and previous_month.month_start =
      (copied_month.month_start - interval '1 month')::date
  join public.budget_items as previous_item
    on previous_item.month_id = previous_month.id
    and previous_item.user_id = previous_month.user_id
    and previous_item.section = 'totalEquity'
  where copied.month_id = copied_month.id
    and copied.user_id = copied_month.user_id
    and copied.section = 'totalEquity'
    and copied.position = previous_item.position
    and copied.name = previous_item.name
    and copied.account_id is null
    and previous_item.account_id is not null;

update public.budget_items as item
  set account_type = coalesce(item.account_type, account.account_type),
      category = coalesce(item.category, account.category)
  from public.account_items as account
  where item.account_id = account.id
    and item.user_id = account.user_id
    and item.section = 'totalEquity'
    and (item.account_type is null or item.category is null);

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

  select budget_month.id, budget_month.month_start
    into v_previous_month_id, v_previous_month_start
    from public.budget_months as budget_month
    where budget_month.user_id = v_user_id
    order by budget_month.month_start desc
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
      account_id,
      account_type,
      category,
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
      coalesce(item.account_type, account.account_type),
      coalesce(item.category, account.category),
      item.scheduled_date
    from public.budget_items as item
    left join public.account_items as account
      on account.id = item.account_id
      and account.user_id = item.user_id
    where item.month_id = v_previous_month_id
      and item.user_id = v_user_id;
  end if;

  perform public.sync_current_month_total_equity(v_user_id);

  month_id := v_new_month_id;
  month_start := v_next_month_start;
  return next;
end;
$$;

revoke all on function public.create_next_budget_month(text)
  from public, anon;
grant execute on function public.create_next_budget_month(text)
  to authenticated;

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

  select budget_month.id, budget_month.month_start
    into v_earliest_month_id, v_earliest_month_start
    from public.budget_months as budget_month
    where budget_month.user_id = v_user_id
    order by budget_month.month_start asc
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
      account_type,
      category,
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
      coalesce(item.account_type, account.account_type),
      coalesce(item.category, account.category),
      item.scheduled_date
    from public.budget_items as item
    left join public.account_items as account
      on account.id = item.account_id
      and account.user_id = item.user_id
    where item.month_id = v_earliest_month_id
      and item.user_id = v_user_id;
  end if;

  perform public.sync_current_month_total_equity(v_user_id);

  month_id := v_new_month_id;
  month_start := v_previous_month_start;
  return next;
end;
$$;

revoke all on function public.create_previous_budget_month(text)
  from public, anon;
grant execute on function public.create_previous_budget_month(text)
  to authenticated;
