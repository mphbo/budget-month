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
      account_id
    )
    select
      v_new_month_id,
      v_user_id,
      item.section,
      item.name,
      item.amount,
      item.position,
      item.account_id
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

revoke all on function public.create_previous_budget_month(text)
  from public, anon;
grant execute on function public.create_previous_budget_month(text)
  to authenticated;
