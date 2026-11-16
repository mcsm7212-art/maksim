-- Invoices: the pro or the company office bills the client for a booking. NovaFides does not take payments;
-- the invoice shows how to pay (Zelle, card link, check...) and the pro marks it paid.
create sequence if not exists public.invoice_no start 1001;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default 'NF-' || nextval('public.invoice_no'),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  pro_id uuid references public.pros (id),
  company_id uuid references public.companies (id),
  client_id uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  -- [{ "kind": "labor" | "material" | "fee" | "discount", "description": "...", "qty": 1, "price": 120.00 }]
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  tax_rate numeric(5,3) not null default 0 check (tax_rate between 0 and 15),   -- % on materials (CA sales tax)
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text check (char_length(notes) <= 1000),
  payment_instructions text check (char_length(payment_instructions) <= 500),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_booking_idx on public.invoices (booking_id);

-- Who may bill a booking: its pro, or the office of its company.
create or replace function public.can_bill(b_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b where b.id = b_id
    and (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))));
$$;

-- Fill parties from the booking and compute totals on the server, so they cannot be faked.
create or replace function public.invoice_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bookings; sub numeric := 0; mat numeric := 0; it jsonb; line numeric;
begin
  if tg_op = 'UPDATE' and old.status in ('paid', 'void') and new.status = old.status then
    raise exception 'a paid or void invoice cannot be changed';
  end if;
  select * into b from public.bookings where id = new.booking_id;
  new.pro_id := b.pro_id; new.company_id := b.company_id; new.client_id := b.client_id;
  for it in select * from jsonb_array_elements(new.items) loop
    if coalesce(it->>'description', '') = '' or (it->>'qty')::numeric <= 0 or (it->>'qty')::numeric > 1000
       or abs((it->>'price')::numeric) > 100000 or coalesce(it->>'kind', '') not in ('labor', 'material', 'fee', 'discount') then
      raise exception 'invalid invoice line';
    end if;
    line := round((it->>'qty')::numeric * abs((it->>'price')::numeric), 2) * case when it->>'kind' = 'discount' then -1 else 1 end;
    sub := sub + line;
    if it->>'kind' = 'material' then mat := mat + line; end if;
  end loop;
  new.subtotal := sub;
  new.tax := round(mat * new.tax_rate / 100, 2);
  new.total := sub + new.tax;
  if new.total < 0 then raise exception 'total cannot be negative'; end if;
  if new.status = 'sent' and new.issued_at is null then new.issued_at := now(); end if;
  if new.status = 'paid' and new.paid_at is null then new.paid_at := now(); end if;
  return new;
end;
$$;
create trigger invoices_before before insert or update on public.invoices
  for each row execute function public.invoice_before();

create or replace function public.invoice_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status <> 'sent') then
    perform public.notify(new.client_id, format('New invoice %s: $%s.', new.number, to_char(new.total, 'FM999999990.00')), '/invoice/' || new.id);
  end if;
  return new;
end;
$$;
create trigger invoices_after after insert or update on public.invoices
  for each row execute function public.invoice_after();

alter table public.invoices enable row level security;
create policy invoices_billing_read on public.invoices for select using (public.can_bill(booking_id) or public.is_admin());
create policy invoices_client_read on public.invoices for select using (client_id = auth.uid() and status <> 'draft');
create policy invoices_insert on public.invoices for insert with check (public.can_bill(booking_id) and created_by = auth.uid());
create policy invoices_update on public.invoices for update using (public.can_bill(booking_id)) with check (public.can_bill(booking_id));
grant select, insert, update on public.invoices to authenticated;
grant usage on sequence public.invoice_no to authenticated;
