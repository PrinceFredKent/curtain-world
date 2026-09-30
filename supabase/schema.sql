-- Curtain World Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text not null unique,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- STAFF (employees + cashiers share this table)
-- ─────────────────────────────────────────────
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text check (role in ('employee', 'cashier', 'both')) default 'both',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  serial unique,
  customer_id   uuid references customers(id) on delete restrict,
  employee_id   uuid references staff(id) on delete set null,
  cashier_id    uuid references staff(id) on delete set null,
  total_amount  numeric(12,2) not null default 0,
  deposit       numeric(12,2) not null default 0,
  balance       numeric(12,2) generated always as (total_amount - deposit) stored,
  status        text check (status in ('pending','partial','paid','cancelled')) default 'pending',
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  item_name   text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  subtotal    numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- TRANSACTIONS (deposits + payments)
-- ─────────────────────────────────────────────
create table if not exists transactions (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references orders(id) on delete cascade,
  customer_id     uuid references customers(id) on delete restrict,
  employee_id     uuid references staff(id) on delete set null,
  cashier_id      uuid references staff(id) on delete set null,
  type            text check (type in ('deposit','payment')) not null,
  amount          numeric(12,2) not null,
  payment_method  text check (payment_method in ('cash','card','transfer','other')) default 'cash',
  receipt_url     text,
  notes           text,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- TRIGGERS: keep orders.deposit & status in sync
-- ─────────────────────────────────────────────
create or replace function sync_order_deposit()
returns trigger language plpgsql as $$
begin
  update orders
  set
    deposit = (
      select coalesce(sum(amount), 0)
      from transactions
      where order_id = coalesce(new.order_id, old.order_id)
    ),
    updated_at = now()
  where id = coalesce(new.order_id, old.order_id);

  -- update status
  update orders
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

drop trigger if exists trg_sync_deposit on transactions;
create trigger trg_sync_deposit
  after insert or update or delete on transactions
  for each row execute function sync_order_deposit();

-- ─────────────────────────────────────────────
-- VIEWS for reports
-- ─────────────────────────────────────────────

-- Daily summary
create or replace view daily_summary as
select
  date_trunc('day', t.created_at at time zone 'UTC') as day,
  count(distinct t.order_id) as orders_count,
  sum(t.amount) as received,
  sum(o.total_amount) - sum(t.amount) as owed
from transactions t
join orders o on o.id = t.order_id
group by 1
order by 1 desc;

-- Employee performance
create or replace view employee_summary as
select
  s.id,
  s.name,
  count(distinct o.id) as orders_count,
  sum(o.total_amount) as total_sales,
  sum(o.deposit) as received,
  sum(o.balance) as owed
from staff s
join orders o on o.employee_id = s.id
group by s.id, s.name;

-- Cashier performance
create or replace view cashier_summary as
select
  s.id,
  s.name,
  count(distinct t.id) as transactions_count,
  sum(t.amount) as total_collected
from staff s
join transactions t on t.cashier_id = s.id
group by s.id, s.name;

-- Row Level Security (enable when you add auth)
-- alter table customers enable row level security;
-- alter table orders enable row level security;
-- alter table order_items enable row level security;
-- alter table transactions enable row level security;
-- alter table staff enable row level security;

-- ─────────────────────────────────────────────
-- SEED: demo staff
-- ─────────────────────────────────────────────
insert into staff (name, role) values
  ('Ahmed', 'employee'),
  ('Sara', 'cashier')
on conflict do nothing;
