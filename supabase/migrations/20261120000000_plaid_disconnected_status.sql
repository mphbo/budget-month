
-- Allow disconnected Plaid Items to remain as historical records.
alter table public.plaid_items
  drop constraint plaid_items_status_check,
  add constraint plaid_items_status_check
    check (status in ('active', 'login_required', 'error', 'disconnected'));

-- Allow access tokens to be cleared after Plaid removes an Item.
alter table public.plaid_items
  alter column access_token_encrypted drop not null,
  drop constraint plaid_items_access_token_encrypted_check,
  add constraint plaid_items_access_token_encrypted_check
    check (
      access_token_encrypted is null
      or length(access_token_encrypted) between 1 and 2000
    );

-- Never return an access token for a disconnected Item.
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
      and item.user_id = v_user_id
      and item.status <> 'disconnected';

  if v_token is null then
    raise exception 'Linked institution not found' using errcode = 'P0002';
  end if;

  return v_token;
end;
$$;
