do $$
begin
  if exists (
    select 1
      from public.account_items as account
      group by account.user_id, pg_catalog.lower(pg_catalog.btrim(account.name))
      having pg_catalog.count(*) > 1
  ) then
    raise exception
      'Resolve duplicate account names (ignoring capitalization) before applying this migration.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
      from public.budget_items as item
      where item.section = 'totalEquity'
      group by item.month_id, pg_catalog.lower(pg_catalog.btrim(item.name))
      having pg_catalog.count(*) > 1
  ) then
    raise exception
      'Resolve duplicate Total Equity item names in each month (ignoring capitalization) before applying this migration.'
      using errcode = '23505';
  end if;
end;
$$;

create unique index account_items_user_name_unique
  on public.account_items (
    user_id,
    pg_catalog.lower(pg_catalog.btrim(name))
  );

create unique index budget_items_month_total_equity_name_unique
  on public.budget_items (
    month_id,
    pg_catalog.lower(pg_catalog.btrim(name))
  )
  where section = 'totalEquity';
