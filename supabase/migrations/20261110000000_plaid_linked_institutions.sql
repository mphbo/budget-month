create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plaid_item_id text not null unique
    check (length(plaid_item_id) between 1 and 200),
  institution_id text check (length(institution_id) between 1 and 200),
  institution_name text not null
    check (length(trim(institution_name)) between 1 and 200),
  access_token_encrypted text not null
    check (length(access_token_encrypted) between 1 and 2000),
  status text not null default 'active'
    check (status in ('active', 'login_required', 'error')),
  error_code text check (length(error_code) <= 200),
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index plaid_items_user_id_idx on public.plaid_items (user_id);

alter table public.plaid_items enable row level security;

create policy "Users read their own linked institutions"
  on public.plaid_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.plaid_items from public, anon, authenticated;
grant select (
  id,
  user_id,
  institution_id,
  institution_name,
  status,
  error_code,
  last_synced_at,
  created_at
) on public.plaid_items to authenticated;

alter table public.account_items
  add column plaid_item_id uuid
    references public.plaid_items (id) on delete set null,
  add column plaid_account_id text
    check (length(plaid_account_id) between 1 and 200);

create unique index account_items_plaid_account_unique
  on public.account_items (plaid_item_id, plaid_account_id)
  where plaid_item_id is not null;

create or replace function public.next_available_account_name(
  p_user_id uuid,
  p_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := pg_catalog.left(pg_catalog.btrim(p_name), 110);
  v_candidate text := pg_catalog.left(pg_catalog.btrim(p_name), 120);
  v_suffix integer := 2;
begin
  while exists (
    select 1
      from public.account_items as account
      where account.user_id = p_user_id
        and pg_catalog.lower(pg_catalog.btrim(account.name)) =
          pg_catalog.lower(v_candidate)
  ) loop
    v_candidate := v_base || ' (' || v_suffix || ')';
    v_suffix := v_suffix + 1;
  end loop;

  return v_candidate;
end;
$$;

revoke all on function public.next_available_account_name(uuid, text)
  from public, anon, authenticated;

create or replace function public.link_plaid_item(
  p_plaid_item_id text,
  p_institution_id text,
  p_institution_name text,
  p_access_token_encrypted text,
  p_accounts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
  v_account jsonb;
  v_sort_order integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_plaid_item_id is null
    or pg_catalog.length(p_plaid_item_id) not between 1 and 200
    or (
      p_institution_id is not null
      and pg_catalog.length(p_institution_id) not between 1 and 200
    )
    or p_institution_name is null
    or pg_catalog.length(pg_catalog.btrim(p_institution_name))
      not between 1 and 200
    or p_access_token_encrypted is null
    or pg_catalog.length(p_access_token_encrypted) not between 1 and 2000
    or p_accounts is null
    or pg_catalog.jsonb_typeof(p_accounts) <> 'array'
    or pg_catalog.jsonb_array_length(p_accounts) > 100 then
    raise exception 'Invalid linked institution' using errcode = '22023';
  end if;

  for v_account in
    select item.value
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_account) <> 'object'
      or pg_catalog.jsonb_typeof(v_account -> 'plaidAccountId')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'name') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'type') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'category')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_account -> 'amount')
        is distinct from 'string'
      or pg_catalog.length(v_account ->> 'plaidAccountId') not between 1 and 200
      or pg_catalog.length(pg_catalog.btrim(v_account ->> 'name'))
        not between 1 and 120
      or (v_account ->> 'type') not in ('asset', 'liability')
      or pg_catalog.length(pg_catalog.btrim(v_account ->> 'category'))
        not between 1 and 100
      or (v_account ->> 'amount') !~ '^[0-9]{1,12}([.][0-9]{1,2})?$' then
      raise exception 'Invalid linked account' using errcode = '22023';
    end if;
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  insert into public.plaid_items as item (
    user_id,
    plaid_item_id,
    institution_id,
    institution_name,
    access_token_encrypted,
    status,
    error_code,
    last_synced_at
  )
  values (
    v_user_id,
    p_plaid_item_id,
    p_institution_id,
    pg_catalog.btrim(p_institution_name),
    p_access_token_encrypted,
    'active',
    null,
    pg_catalog.now()
  )
  on conflict (plaid_item_id) do update
    set institution_id = excluded.institution_id,
        institution_name = excluded.institution_name,
        access_token_encrypted = excluded.access_token_encrypted,
        status = 'active',
        error_code = null,
        last_synced_at = excluded.last_synced_at
    where item.user_id = v_user_id
  returning item.id into v_item_id;

  if v_item_id is null then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;

  for v_account in
    select item.value
      from pg_catalog.jsonb_array_elements(p_accounts) as item(value)
  loop
    update public.account_items as account
      set amount = (v_account ->> 'amount')::numeric
      where account.user_id = v_user_id
        and account.plaid_item_id = v_item_id
        and account.plaid_account_id = v_account ->> 'plaidAccountId';

    if not found then
      select coalesce(pg_catalog.max(account.sort_order) + 1, 0)
        into v_sort_order
        from public.account_items as account
        where account.user_id = v_user_id;

      if v_sort_order >= 100 then
        raise exception 'Account limit reached' using errcode = '22023';
      end if;

      insert into public.account_items (
        user_id,
        name,
        account_type,
        category,
        amount,
        sort_order,
        plaid_item_id,
        plaid_account_id
      )
      values (
        v_user_id,
        public.next_available_account_name(v_user_id, v_account ->> 'name'),
        v_account ->> 'type',
        pg_catalog.btrim(v_account ->> 'category'),
        (v_account ->> 'amount')::numeric,
        v_sort_order,
        v_item_id,
        v_account ->> 'plaidAccountId'
      );
    end if;
  end loop;

  perform public.sync_current_month_total_equity(v_user_id);

  return v_item_id;
end;
$$;

create or replace function public.update_plaid_item_balances(
  p_item_id uuid,
  p_balances jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_item_id is null
    or p_balances is null
    or pg_catalog.jsonb_typeof(p_balances) <> 'array'
    or pg_catalog.jsonb_array_length(p_balances) > 100 then
    raise exception 'Invalid balances' using errcode = '22023';
  end if;

  for v_balance in
    select item.value
      from pg_catalog.jsonb_array_elements(p_balances) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_balance) <> 'object'
      or pg_catalog.jsonb_typeof(v_balance -> 'plaidAccountId')
        is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_balance -> 'amount')
        is distinct from 'string'
      or (v_balance ->> 'amount') !~ '^[0-9]{1,12}([.][0-9]{1,2})?$' then
      raise exception 'Invalid balance' using errcode = '22023';
    end if;
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  update public.plaid_items as item
    set status = 'active',
        error_code = null,
        last_synced_at = pg_catalog.now()
    where item.id = p_item_id
      and item.user_id = v_user_id;

  if not found then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;

  update public.account_items as account
    set amount = (balance.value ->> 'amount')::numeric
    from pg_catalog.jsonb_array_elements(p_balances) as balance(value)
    where account.user_id = v_user_id
      and account.plaid_item_id = p_item_id
      and account.plaid_account_id = balance.value ->> 'plaidAccountId';

  perform public.sync_current_month_total_equity(v_user_id);
end;
$$;

create or replace function public.set_plaid_item_status(
  p_item_id uuid,
  p_status text,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_item_id is null
    or p_status not in ('active', 'login_required', 'error')
    or pg_catalog.length(p_error_code) > 200 then
    raise exception 'Invalid institution status' using errcode = '22023';
  end if;

  update public.plaid_items as item
    set status = p_status,
        error_code = p_error_code
    where item.id = p_item_id
      and item.user_id = v_user_id;

  if not found then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_plaid_item_access_token(p_item_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select item.access_token_encrypted
    into v_token
    from public.plaid_items as item
    where item.id = p_item_id
      and item.user_id = v_user_id;

  if v_token is null then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;

  return v_token;
end;
$$;

create or replace function public.unlink_plaid_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  update public.account_items as account
    set plaid_item_id = null,
        plaid_account_id = null
    where account.user_id = v_user_id
      and account.plaid_item_id = p_item_id;

  delete from public.plaid_items as item
    where item.id = p_item_id
      and item.user_id = v_user_id;

  if not found then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.link_plaid_item(text, text, text, text, jsonb)
  from public, anon;
revoke all on function public.update_plaid_item_balances(uuid, jsonb)
  from public, anon;
revoke all on function public.set_plaid_item_status(uuid, text, text)
  from public, anon;
revoke all on function public.get_plaid_item_access_token(uuid)
  from public, anon;
revoke all on function public.unlink_plaid_item(uuid) from public, anon;

grant execute on function public.link_plaid_item(text, text, text, text, jsonb)
  to authenticated;
grant execute on function public.update_plaid_item_balances(uuid, jsonb)
  to authenticated;
grant execute on function public.set_plaid_item_status(uuid, text, text)
  to authenticated;
grant execute on function public.get_plaid_item_access_token(uuid)
  to authenticated;
grant execute on function public.unlink_plaid_item(uuid) to authenticated;
