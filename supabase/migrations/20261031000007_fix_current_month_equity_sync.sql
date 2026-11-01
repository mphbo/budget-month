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

  select budget_month.id
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
