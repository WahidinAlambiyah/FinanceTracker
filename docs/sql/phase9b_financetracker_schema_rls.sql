-- Phase 9B SQL Draft - FinanceTracker Supabase Remote Schema and RLS
--
-- STATUS: DRAFT ONLY. DO NOT APPLY WITHOUT MANUAL REVIEW AND APPROVAL.
--
-- Purpose:
-- - Prepare the remote Supabase persistence schema for future sync phases.
-- - Keep application tables in the custom "financetracker" schema.
-- - Enable RLS so authenticated users can access only their own records.
--
-- Non-goals:
-- - This does not implement push sync.
-- - This does not implement pull sync.
-- - This does not create remote repositories.
-- - This does not create a remote sync_queue table.
-- - This does not store wallet balances.
-- - This does not add remote sync_status columns.
--
-- Manual Supabase setup reminder:
-- - If the app will access this custom schema through Supabase APIs, expose the
--   "financetracker" schema in Supabase API settings after review.

begin;

-- 1. Custom application schema
create schema if not exists financetracker;

comment on schema financetracker is
  'FinanceTracker application data schema. Auth remains managed by Supabase in auth schema.';

-- Grant strategy:
-- - Financial data is available to authenticated users only.
-- - Anonymous access is intentionally not granted unless separately approved.
-- - The custom "financetracker" schema must be exposed manually in Supabase
--   API settings before Phase 10 remote repositories can access it.
-- - RLS policies below still enforce row-level ownership after schema/table
--   privileges are granted.
grant usage on schema financetracker to authenticated;

-- 2. Profiles
--
-- Profile insert strategy:
-- - id must match auth.users.id.
-- - This draft allows an authenticated user to insert exactly their own profile.
-- - A later trigger-based profile creation approach may replace app-created
--   profile inserts, but that should be approved separately before execution.
create table if not exists financetracker.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_profiles_deleted_at
  on financetracker.profiles(deleted_at);

comment on table financetracker.profiles is
  'User profile rows. id must match auth.users.id.';

-- 3. Wallets
--
-- No balance column by design. Wallet balance remains derived from
-- opening_balance and transactions.
create table if not exists financetracker.wallets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'ewallet', 'other')),
  opening_balance bigint not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  constraint wallets_user_id_id_unique unique (user_id, id)
);

create index if not exists idx_wallets_user_id
  on financetracker.wallets(user_id);

create index if not exists idx_wallets_updated_at
  on financetracker.wallets(updated_at);

create index if not exists idx_wallets_user_updated_at
  on financetracker.wallets(user_id, updated_at);

create index if not exists idx_wallets_user_deleted_at
  on financetracker.wallets(user_id, deleted_at);

comment on table financetracker.wallets is
  'Remote wallet records for future sync. Balances are not stored.';

-- 4. Categories
create table if not exists financetracker.categories (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  constraint categories_user_id_id_unique unique (user_id, id)
);

create index if not exists idx_categories_user_id
  on financetracker.categories(user_id);

create index if not exists idx_categories_type
  on financetracker.categories(type);

create index if not exists idx_categories_user_type
  on financetracker.categories(user_id, type);

create index if not exists idx_categories_updated_at
  on financetracker.categories(updated_at);

create index if not exists idx_categories_user_updated_at
  on financetracker.categories(user_id, updated_at);

create index if not exists idx_categories_user_deleted_at
  on financetracker.categories(user_id, deleted_at);

comment on table financetracker.categories is
  'Remote category records for future sync.';

-- 5. Transactions
--
-- Foreign key strategy:
-- - Transactions use composite foreign keys including user_id.
-- - This prevents a transaction owned by one user from referencing another
--   user's wallet or category, even if a UUID is known.
-- - Soft-deleted wallets/categories can still be referenced by historical
--   transactions because soft delete only updates deleted_at.
-- - No extra transaction type/category/destination check is added here so the
--   remote schema stays aligned with the current SQLite schema and app services.
create table if not exists financetracker.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  wallet_id uuid not null,
  destination_wallet_id uuid,
  category_id uuid,
  amount bigint not null check (amount > 0),
  note text,
  transaction_date timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  constraint transactions_user_wallet_fk
    foreign key (user_id, wallet_id)
    references financetracker.wallets(user_id, id),
  constraint transactions_user_destination_wallet_fk
    foreign key (user_id, destination_wallet_id)
    references financetracker.wallets(user_id, id),
  constraint transactions_user_category_fk
    foreign key (user_id, category_id)
    references financetracker.categories(user_id, id)
);

create index if not exists idx_transactions_user_id
  on financetracker.transactions(user_id);

create index if not exists idx_transactions_wallet_id
  on financetracker.transactions(wallet_id);

create index if not exists idx_transactions_category_id
  on financetracker.transactions(category_id);

create index if not exists idx_transactions_date
  on financetracker.transactions(transaction_date);

create index if not exists idx_transactions_updated_at
  on financetracker.transactions(updated_at);

create index if not exists idx_transactions_user_updated_at
  on financetracker.transactions(user_id, updated_at);

create index if not exists idx_transactions_user_transaction_date
  on financetracker.transactions(user_id, transaction_date);

create index if not exists idx_transactions_user_deleted_at
  on financetracker.transactions(user_id, deleted_at);

comment on table financetracker.transactions is
  'Remote transaction records for future sync. Amount is integer Rupiah.';

-- 6. Table grants
--
-- The authenticated role needs table privileges before RLS policies can allow
-- access. RLS still restricts rows per policy.
grant select, insert, update
  on financetracker.profiles,
     financetracker.wallets,
     financetracker.categories,
     financetracker.transactions
  to authenticated;

-- Hard DELETE is intentionally unavailable to authenticated clients for MVP.
-- Local and future remote sync must represent deletion by updating deleted_at.
-- Revoke DELETE explicitly in case privileges were granted by an earlier draft.
revoke delete
  on financetracker.profiles,
     financetracker.wallets,
     financetracker.categories,
     financetracker.transactions
  from authenticated;

-- 7. Enable Row Level Security
alter table financetracker.profiles enable row level security;
alter table financetracker.wallets enable row level security;
alter table financetracker.categories enable row level security;
alter table financetracker.transactions enable row level security;

-- 8. Profiles RLS policies
drop policy if exists "Users can select own profile"
  on financetracker.profiles;
create policy "Users can select own profile"
  on financetracker.profiles
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = id);

drop policy if exists "Users can insert own profile"
  on financetracker.profiles;
create policy "Users can insert own profile"
  on financetracker.profiles
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = id);

drop policy if exists "Users can update own profile"
  on financetracker.profiles;
create policy "Users can update own profile"
  on financetracker.profiles
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = id)
  with check (auth.uid() is not null and auth.uid() = id);

-- No profile DELETE policy is included in this draft. Profile removal should be
-- handled through auth account lifecycle or soft delete unless separately approved.

-- 9. Wallet RLS policies
drop policy if exists "Users can select own wallets"
  on financetracker.wallets;
create policy "Users can select own wallets"
  on financetracker.wallets
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can insert own wallets"
  on financetracker.wallets;
create policy "Users can insert own wallets"
  on financetracker.wallets
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can update own wallets"
  on financetracker.wallets;
create policy "Users can update own wallets"
  on financetracker.wallets
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Remove any hard-delete policy that may exist from an earlier draft.
drop policy if exists "Users can delete own wallets"
  on financetracker.wallets;

-- Normal app delete should remain a soft delete:
-- update financetracker.wallets set deleted_at = now(), updated_at = now() where ...

-- 10. Category RLS policies
drop policy if exists "Users can select own categories"
  on financetracker.categories;
create policy "Users can select own categories"
  on financetracker.categories
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can insert own categories"
  on financetracker.categories;
create policy "Users can insert own categories"
  on financetracker.categories
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can update own categories"
  on financetracker.categories;
create policy "Users can update own categories"
  on financetracker.categories
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Remove any hard-delete policy that may exist from an earlier draft.
drop policy if exists "Users can delete own categories"
  on financetracker.categories;

-- Normal app delete should remain a soft delete:
-- update financetracker.categories set deleted_at = now(), updated_at = now() where ...

-- 11. Transaction RLS policies
drop policy if exists "Users can select own transactions"
  on financetracker.transactions;
create policy "Users can select own transactions"
  on financetracker.transactions
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can insert own transactions"
  on financetracker.transactions;
create policy "Users can insert own transactions"
  on financetracker.transactions
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can update own transactions"
  on financetracker.transactions;
create policy "Users can update own transactions"
  on financetracker.transactions
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Remove any hard-delete policy that may exist from an earlier draft.
drop policy if exists "Users can delete own transactions"
  on financetracker.transactions;

-- Normal app delete should remain a soft delete:
-- update financetracker.transactions set deleted_at = now(), updated_at = now() where ...

commit;

-- Rollback / cleanup draft
-- ---------------------------------------------------------------------------
-- Review before running. This section is intentionally commented out so it
-- cannot be executed accidentally with the schema draft above.
--
-- begin;
-- drop table if exists financetracker.transactions cascade;
-- drop table if exists financetracker.categories cascade;
-- drop table if exists financetracker.wallets cascade;
-- drop table if exists financetracker.profiles cascade;
-- drop schema if exists financetracker;
-- commit;
