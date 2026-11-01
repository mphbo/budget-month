create or replace function public.delete_budget_month(p_month_start date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_month_start date :=
    pg_catalog.date_trunc('month', current_date)::date;
  v_first_month_start date;
  v_last_month_start date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_month_start is null
    or p_month_start <> pg_catalog.date_trunc('month', p_month_start)::date then
    raise exception 'Invalid month' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select
    pg_catalog.min(month_row.month_start),
    pg_catalog.max(month_row.month_start)
    into v_first_month_start, v_last_month_start
    from public.budget_months as month_row
    where month_row.user_id = v_user_id;

  if not exists (
    select 1
      from public.budget_months as month_row
      where month_row.user_id = v_user_id
        and month_row.month_start = p_month_start
  ) then
    return 'not_found';
  end if;

  if p_month_start = v_current_month_start
    or (
      p_month_start < v_current_month_start
      and p_month_start <> v_first_month_start
    )
    or (
      p_month_start > v_current_month_start
      and p_month_start <> v_last_month_start
    ) then
    return 'not_deletable';
  end if;

  delete from public.budget_months as month_row
    where month_row.user_id = v_user_id
      and month_row.month_start = p_month_start;

  return 'deleted';
end;
$$;

revoke all on function public.delete_budget_month(date)
  from public, anon;
grant execute on function public.delete_budget_month(date)
  to authenticated;
