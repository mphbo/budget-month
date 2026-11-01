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
  v_section text;
  v_entries jsonb;
  v_item jsonb;
  v_name text;
  v_amount_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

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
        from pg_catalog.jsonb_array_elements(v_entries)
          as entry(value)
    loop
      if pg_catalog.jsonb_typeof(v_item) <> 'object'
        or pg_catalog.jsonb_typeof(v_item -> 'item') <> 'string'
        or pg_catalog.jsonb_typeof(v_item -> 'amount') <> 'string' then
        raise exception 'Invalid budget entry' using errcode = '22023';
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

  delete from public.budget_items as bi
    where bi.month_id = v_month_id
      and bi.user_id = v_user_id;

  insert into public.budget_items (
    month_id,
    user_id,
    section,
    name,
    amount,
    position
  )
  select
    v_month_id,
    v_user_id,
    section_data.section,
    pg_catalog.btrim(item.value ->> 'item'),
    (item.value ->> 'amount')::numeric,
    (item.ordinality - 1)::integer
  from pg_catalog.unnest(array[
    'income',
    'expenses',
    'equityChange',
    'totalEquity'
  ]) as section_data(section)
  cross join lateral pg_catalog.jsonb_array_elements(
    p_budget -> section_data.section
  ) with ordinality as item(value, ordinality);
end;
$$;

revoke all on function public.save_budget_month(date, jsonb) from public, anon;
grant execute on function public.save_budget_month(date, jsonb) to authenticated;
