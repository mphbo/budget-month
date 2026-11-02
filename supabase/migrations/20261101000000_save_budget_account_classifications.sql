create or replace function public.save_budget_month_with_account_classifications(
  p_month_start date,
  p_budget jsonb,
  p_classifications jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_classification jsonb;
  v_account_id uuid;
  v_account_type text;
  v_category text;
  v_account_ids uuid[] := array[]::uuid[];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_classifications is null
    or pg_catalog.jsonb_typeof(p_classifications) <> 'array'
    or pg_catalog.jsonb_array_length(p_classifications) > 100 then
    raise exception 'Invalid account classifications' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  for v_classification in
    select item.value
      from pg_catalog.jsonb_array_elements(p_classifications) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_classification) <> 'object'
      or pg_catalog.jsonb_typeof(v_classification -> 'accountId')
        is distinct from 'string'
      or (v_classification ->> 'accountId') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or pg_catalog.jsonb_typeof(v_classification -> 'accountType')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_classification -> 'category')
        is distinct from 'string' then
      raise exception 'Invalid account classification'
        using errcode = '22023';
    end if;

    v_account_id := (v_classification ->> 'accountId')::uuid;
    v_account_type := v_classification ->> 'accountType';
    v_category := pg_catalog.btrim(v_classification ->> 'category');

    if v_account_id = any(v_account_ids)
      or v_account_type not in ('asset', 'liability')
      or pg_catalog.length(v_category) not between 1 and 100 then
      raise exception 'Invalid account classification'
        using errcode = '22023';
    end if;
    v_account_ids := pg_catalog.array_append(v_account_ids, v_account_id);

    update public.account_items as account
      set account_type = v_account_type,
          category = v_category
      where account.id = v_account_id
        and account.user_id = v_user_id;

    if not found then
      raise exception 'Account not found' using errcode = 'P0002';
    end if;
  end loop;

  perform public.save_budget_month(p_month_start, p_budget);
  perform public.sync_current_month_total_equity(v_user_id);
end;
$$;

revoke all on function public.save_budget_month_with_account_classifications(
  date, jsonb, jsonb
) from public, anon;
grant execute on function public.save_budget_month_with_account_classifications(
  date, jsonb, jsonb
) to authenticated;
