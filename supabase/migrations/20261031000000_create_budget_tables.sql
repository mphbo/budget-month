create table public.budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  created_at timestamptz not null default now(),
  constraint budget_months_user_month_unique unique (user_id, month_start),
  constraint budget_months_id_user_unique unique (id, user_id)
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (
    section in ('income', 'expenses', 'equityChange', 'totalEquity')
  ),
  name text not null check (length(trim(name)) > 0),
  amount numeric(14, 2) not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  constraint budget_items_month_owner_fkey
    foreign key (month_id, user_id)
    references public.budget_months (id, user_id)
    on delete cascade
);

create index budget_items_month_section_position_idx
  on public.budget_items (month_id, section, position);

alter table public.budget_months enable row level security;
alter table public.budget_items enable row level security;

create policy "Users read their own budget months"
  on public.budget_months
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users read their own budget items"
  on public.budget_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.budget_months, public.budget_items
  from public, anon, authenticated;
grant select on public.budget_months, public.budget_items to authenticated;

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

  month_id := v_new_month_id;
  month_start := v_next_month_start;
  return next;
end;
$$;

revoke all on function public.create_next_budget_month(text) from public, anon;
grant execute on function public.create_next_budget_month(text) to authenticated;
