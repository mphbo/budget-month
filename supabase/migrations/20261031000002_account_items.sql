create table public.account_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  account_type text not null check (account_type in ('asset', 'liability')),
  category text not null check (length(trim(category)) between 1 and 100),
  amount numeric(14, 2) not null check (amount >= 0),
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index account_items_user_sort_order_idx
  on public.account_items (user_id, sort_order);

alter table public.account_items enable row level security;

create policy "Users read their own accounts"
  on public.account_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.account_items from public, anon, authenticated;
grant select on public.account_items to authenticated;

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

  if p_name is null or pg_catalog.length(pg_catalog.btrim(p_name)) not between 1 and 120
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

  for v_account in
    select item.value
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_account) <> 'object'
      or pg_catalog.jsonb_typeof(v_account -> 'name') <> 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'type') <> 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'category') <> 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'amount') <> 'string' then
      raise exception 'Invalid account entry' using errcode = '22023';
    end if;

    v_name := pg_catalog.btrim(v_account ->> 'name');
    v_type := v_account ->> 'type';
    v_category := pg_catalog.btrim(v_account ->> 'category');
    v_amount := v_account ->> 'amount';

    if pg_catalog.length(v_name) not between 1 and 120
      or v_type not in ('asset', 'liability')
      or pg_catalog.length(v_category) not between 1 and 100
      or v_amount !~ '^[0-9]{1,12}([.][0-9]{1,2})?$' then
      raise exception 'Invalid account details' using errcode = '22023';
    end if;
  end loop;

  delete from public.account_items as account
    where account.user_id = v_user_id;

  insert into public.account_items (
    user_id,
    name,
    account_type,
    category,
    amount,
    sort_order
  )
  select
    v_user_id,
    pg_catalog.btrim(account.value ->> 'name'),
    account.value ->> 'type',
    pg_catalog.btrim(account.value ->> 'category'),
    (account.value ->> 'amount')::numeric,
    (account.ordinality - 1)::integer
  from pg_catalog.jsonb_array_elements(p_accounts)
    with ordinality as account(value, ordinality);
end;
$$;

revoke all on function public.create_account_item(text, text, text, numeric)
  from public, anon;
revoke all on function public.save_account_items(jsonb) from public, anon;
grant execute on function public.create_account_item(text, text, text, numeric)
  to authenticated;
grant execute on function public.save_account_items(jsonb) to authenticated;
