update public.account_items
set category = case category
  when 'House Value' then 'Property'
  when 'Car Value' then 'Vehicle'
  when 'Car Loan' then 'Vehicle Loan'
  else category
end
where category in ('House Value', 'Car Value', 'Car Loan');

update public.budget_items
set category = case category
  when 'House Value' then 'Property'
  when 'Car Value' then 'Vehicle'
  when 'Car Loan' then 'Vehicle Loan'
  else category
end
where category in ('House Value', 'Car Value', 'Car Loan');
