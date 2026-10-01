-- ═════════════════════════════════════════════════════════════════════════════
-- CURTAIN WORLD - COMPLETE & SAFE SUPABASE DATABASE SETUP / MIGRATION
-- Run this entire script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Enable UUID Extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 2. STAFF TABLE (Fixes old constraints and adds all required columns)
-- ─────────────────────────────────────────────
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Safely add all columns
alter table public.staff add column if not exists email text;
alter table public.staff add column if not exists phone text;
alter table public.staff add column if not exists role text;
alter table public.staff add column if not exists active boolean default true;
alter table public.staff add column if not exists verified boolean default false;
alter table public.staff add column if not exists status text default 'pending_verification';
alter table public.staff add column if not exists created_at timestamptz default now();

-- Drop old restrictive role check constraint that blocked 'super_admin' or pending (null) roles
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (
  role is null or role in ('super_admin', 'admin', 'employee', 'cashier', 'both', 'workshop', 'installer')
);

-- Ensure unique email constraint
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_email_key') then
    begin
      alter table public.staff add constraint staff_email_key unique (email);
    exception when others then null;
    end;
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 3. CUSTOMERS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text not null,
  created_at  timestamptz default now()
);

alter table public.customers add column if not exists full_name text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists created_at timestamptz default now();

-- ─────────────────────────────────────────────
-- 4. ORDERS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  serial unique,
  customer_id   uuid references public.customers(id) on delete restrict,
  employee_id   uuid references public.staff(id) on delete set null,
  cashier_id    uuid references public.staff(id) on delete set null,
  total_amount  numeric(12,2) not null default 0,
  deposit       numeric(12,2) not null default 0,
  balance       numeric(12,2) generated always as (total_amount - deposit) stored,
  status        text default 'pending',
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists updated_at timestamptz default now();

-- ─────────────────────────────────────────────
-- 5. ORDER ITEMS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders(id) on delete cascade,
  item_name   text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  subtotal    numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 6. TRANSACTIONS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references public.orders(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete restrict,
  employee_id     uuid references public.staff(id) on delete set null,
  cashier_id      uuid references public.staff(id) on delete set null,
  type            text not null default 'deposit',
  amount          numeric(14,2) not null default 0,
  payment_method  text default 'momo',
  receipt_url     text,
  notes           text,
  created_at      timestamptz default now()
);

-- Drop old restrictive check constraint on payment_method
alter table public.transactions drop constraint if exists transactions_payment_method_check;
alter table public.transactions add constraint transactions_payment_method_check check (
  payment_method is null or payment_method in (
    'cash', 'momo', 'airtel', 'bank', 'card', 'other',
    'mobile_money', 'mtn_momo', 'airtel_money', 'bank_transfer', 'pos', 'transfer'
  )
);

-- ─────────────────────────────────────────────
-- 7. AUTOMATIC AUTH -> STAFF TRIGGER (Handles every online signup)
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_super boolean;
  user_full_name text;
  user_phone text;
  user_role text;
  user_verified boolean;
  user_status text;
begin
  is_super := lower(trim(new.email)) = 'sharityra41@gmail.com';
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  user_phone := coalesce(new.raw_user_meta_data->>'phone', new.phone, '');
  
  if is_super then
    user_role := 'super_admin';
    user_verified := true;
    user_status := 'active';
  else
    user_role := new.raw_user_meta_data->>'role';
    user_verified := coalesce((new.raw_user_meta_data->>'verified')::boolean, false);
    user_status := case when user_verified and user_role is not null then 'active' else 'pending_verification' end;
  end if;

  insert into public.staff (id, name, email, phone, role, active, verified, status, created_at)
  values (
    new.id,
    user_full_name,
    lower(trim(new.email)),
    user_phone,
    user_role,
    case when is_super then true else coalesce(user_verified and user_role is not null, false) end,
    user_verified,
    user_status,
    now()
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    phone = coalesce(nullif(excluded.phone, ''), public.staff.phone);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing users from auth.users (like Prince and Sharity) into staff
insert into public.staff (id, name, email, phone, role, active, verified, status, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  lower(trim(u.email)),
  coalesce(u.raw_user_meta_data->>'phone', u.phone, ''),
  case when lower(trim(u.email)) = 'sharityra41@gmail.com' then 'super_admin' else u.raw_user_meta_data->>'role' end,
  case when lower(trim(u.email)) = 'sharityra41@gmail.com' then true else coalesce((u.raw_user_meta_data->>'verified')::boolean, false) end,
  case when lower(trim(u.email)) = 'sharityra41@gmail.com' then true else coalesce((u.raw_user_meta_data->>'verified')::boolean, false) end,
  case when lower(trim(u.email)) = 'sharityra41@gmail.com' then 'active' else coalesce(u.raw_user_meta_data->>'status', 'pending_verification') end,
  coalesce(u.created_at, now())
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  name = coalesce(nullif(excluded.name, ''), public.staff.name);

-- ─────────────────────────────────────────────
-- 8. TRIGGERS: sync order deposits & status
-- ─────────────────────────────────────────────
create or replace function public.sync_order_deposit()
returns trigger language plpgsql as $$
begin
  update public.orders
  set
    deposit = (
      select coalesce(sum(amount), 0)
      from public.transactions
      where order_id = coalesce(new.order_id, old.order_id)
    ),
    updated_at = now()
  where id = coalesce(new.order_id, old.order_id);

  update public.orders
  set status = case
    when total_amount = 0 then 'pending'
    when deposit >= total_amount then 'paid'
    when deposit > 0 then 'partial'
    else 'pending'
  end
  where id = coalesce(new.order_id, old.order_id);

  return new;
end;
$$;

drop trigger if exists trg_sync_deposit on public.transactions;
create trigger trg_sync_deposit
  after insert or update or delete on public.transactions
  for each row execute function public.sync_order_deposit();

-- ─────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────
alter table public.customers enable row level security;
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.transactions enable row level security;

-- Drop old policies to prevent collision
drop policy if exists "Allow all authenticated users full access to customers" on public.customers;
drop policy if exists "Allow anon read customers" on public.customers;
drop policy if exists "Allow all access to staff for authenticated users" on public.staff;
drop policy if exists "Allow anon read and insert staff for registration" on public.staff;
drop policy if exists "Allow authenticated full access to orders" on public.orders;
drop policy if exists "Allow authenticated full access to order_items" on public.order_items;
drop policy if exists "Allow authenticated full access to transactions" on public.transactions;

-- Customers policies
create policy "Allow all authenticated users full access to customers"
  on public.customers for all
  to authenticated
  using (true) with check (true);

create policy "Allow anon read customers"
  on public.customers for select
  to anon
  using (true);

-- Staff policies (Allows all operations so Super Admin can verify/update staff and new registrations can sync)
create policy "Allow all access to staff for authenticated users"
  on public.staff for all
  to authenticated
  using (true) with check (true);

create policy "Allow anon read and insert staff for registration"
  on public.staff for all
  to anon
  using (true) with check (true);

-- Orders policies
create policy "Allow authenticated full access to orders"
  on public.orders for all
  to authenticated
  using (true) with check (true);

-- Order items policies
create policy "Allow authenticated full access to order_items"
  on public.order_items for all
  to authenticated
  using (true) with check (true);

-- Transactions policies
create policy "Allow authenticated full access to transactions"
  on public.transactions for all
  to authenticated
  using (true) with check (true);

-- ─────────────────────────────────────────────
-- 10. REALTIME CONFIGURATION
-- ─────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.staff;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.customers;
exception when others then null;
end $$;

-- ─────────────────────────────────────────────
-- 11. Ensure Super Admin Account Record Exists
-- ─────────────────────────────────────────────
insert into public.staff (name, email, phone, role, active, verified, status)
values (
  'Sharity (Super Admin)',
  'sharityra41@gmail.com',
  '+256 700 000 001',
  'super_admin',
  true,
  true,
  'active'
)
on conflict (email) do update
set role = 'super_admin', verified = true, active = true, status = 'active';
