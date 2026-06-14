# Phase 9C Manual Apply and RLS Test Guide

**Status**: Guide prepared; manual Supabase execution not started  
**SQL draft**: `docs/sql/phase9b_financetracker_schema_rls.sql`

This guide is documentation only. Do not apply the SQL until the Phase 9B draft and target Supabase project have been reviewed and approved.

## 1. Pre-Apply Checklist

- [ ] Confirm the correct Supabase organization, project name, and project reference.
- [ ] Confirm the project is not production, or create an appropriate backup/export before changing an existing project.
- [ ] Confirm the reviewed draft is `docs/sql/phase9b_financetracker_schema_rls.sql`.
- [ ] Confirm the draft contains only the `financetracker` schema, four application tables, grants, RLS, policies, and a commented rollback section.
- [ ] Confirm no application code currently depends on the remote financial tables.
- [ ] Confirm runtime financial reads/writes remain SQLite-first.
- [ ] Confirm Phase 10 push sync and Phase 11 pull sync have not started.
- [ ] Record who approved the SQL and when it is applied.

## 2. Manual Apply Steps

1. Sign in to the Supabase dashboard and open the confirmed project.
2. Open **SQL Editor** and create a new query.
3. Open `docs/sql/phase9b_financetracker_schema_rls.sql` locally.
4. Review the target schema, tables, grants, RLS policies, and transaction boundaries again.
5. Copy only the active schema SQL. The rollback section must remain commented.
6. Run the SQL manually only after approval.
7. Save the SQL Editor result or execution timestamp for the Phase 9C review record.
8. Run the verification queries below before performing any RLS data tests.

Do not paste or run the rollback block during normal application.

## 3. Custom Schema Exposure

The SQL grants schema/table access to `authenticated`, but Supabase API exposure is a separate project setting.

- Keep `financetracker` unexposed until the team is ready to test or begin Phase 10.
- Before Phase 10 remote repositories use the schema, add `financetracker` to the exposed schemas in Supabase API settings.
- Do not grant schema or table access to `anon` unless separately reviewed and approved.
- Exposing a schema does not replace RLS; both API exposure and correct RLS policies are required.

## 4. Structural Verification SQL

Run these read-only queries in SQL Editor after applying the draft.

### Confirm Schema

```sql
select schema_name
from information_schema.schemata
where schema_name = 'financetracker';
```

Expected: one row.

### Confirm Tables

```sql
select table_name
from information_schema.tables
where table_schema = 'financetracker'
order by table_name;
```

Expected: `categories`, `profiles`, `transactions`, and `wallets`.

### Confirm RLS Is Enabled

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'financetracker'
order by tablename;
```

Expected: `rowsecurity = true` for all four tables.

### Confirm Policies

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'financetracker'
order by tablename, cmd, policyname;
```

Expected:

- Profiles: SELECT, INSERT, and UPDATE policies only.
- Wallets, categories, and transactions: SELECT, INSERT, and UPDATE policies only.
- Every policy is scoped to `authenticated`.
- Ownership expressions include `auth.uid() is not null` and the matching owner ID.
- No DELETE policies exist.

### Confirm Authenticated Privileges

```sql
select
  table_name,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'SELECT') as can_select,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'INSERT') as can_insert,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'UPDATE') as can_update,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'DELETE') as can_delete
from information_schema.tables
where table_schema = 'financetracker'
order by table_name;
```

Expected: SELECT/INSERT/UPDATE are true and DELETE is false for all four tables.

### Confirm Anonymous Access Is Not Granted

```sql
select
  table_name,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT') as anon_select,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'INSERT') as anon_insert,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'UPDATE') as anon_update,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'DELETE') as anon_delete
from information_schema.tables
where table_schema = 'financetracker'
order by table_name;
```

Expected: all values are false.

## 5. Two-User RLS Test Checklist

Create two dedicated test users through Supabase Auth and record their UUIDs as User A and User B. Do not use real financial data.

RLS tests must run as authenticated user sessions, not as the SQL Editor's privileged database owner. A privileged SQL Editor session can bypass normal API authorization and is not proof that RLS works.

Expose `financetracker` through Supabase API settings only when this authenticated API test is approved. Use two separate authenticated sessions, such as separate browser profiles or a temporary approved test client. Do not use the service-role key.

### User A Own-Row Tests

- [ ] User A can insert a profile whose `id` equals User A's `auth.users.id`.
- [ ] User A cannot insert a profile using User B's ID.
- [ ] User A can select and update their own profile.
- [ ] User A can insert and select their own wallet.
- [ ] User A can insert and select their own category.
- [ ] User A can insert a transaction referencing only User A's wallet/category.
- [ ] User A can update their own wallet, category, and transaction.

### Cross-User Isolation Tests

- [ ] User A cannot select User B's profile, wallets, categories, or transactions.
- [ ] User A cannot insert wallet/category/transaction rows with User B's `user_id`.
- [ ] User A cannot update User B's rows.
- [ ] User A cannot change an owned row's `user_id` to User B because UPDATE `WITH CHECK` rejects it.
- [ ] User A cannot create a transaction referencing User B's wallet/category because composite foreign keys include `user_id`.
- [ ] Repeat equivalent checks from User B's session against User A's rows.

### Delete Behavior Tests

- [ ] User A cannot hard delete an owned wallet, category, transaction, or profile.
- [ ] The hard-delete attempt fails because DELETE privilege is revoked and no DELETE policy exists.
- [ ] User A can soft delete an owned record by updating `deleted_at` and `updated_at`.
- [ ] User A cannot soft delete User B's record because UPDATE ownership policies reject it.

Clean up test data only through an approved administrator path after testing. Do not add hard-delete capability to the app for cleanup.

## 6. Rollback Warning

The SQL draft contains a separate, commented rollback section. It must not be run casually.

Running rollback will drop the remote `transactions`, `categories`, `wallets`, and `profiles` tables and delete their data. Review backups, environment, dependencies, and approval before using it. Never include the rollback block in the normal apply operation.

## 7. Pass/Fail Checklist

Phase 9C passes only when all applicable items are confirmed:

- [ ] SQL was applied to the correct approved Supabase project.
- [ ] The `financetracker` schema and four expected tables exist.
- [ ] RLS is enabled on every table.
- [ ] Expected SELECT/INSERT/UPDATE policies exist.
- [ ] No hard DELETE policies or authenticated DELETE privileges exist.
- [ ] No anonymous table privileges exist.
- [ ] User A and User B can access only their own rows.
- [ ] Cross-user insert, select, update, and relationship attempts fail.
- [ ] Soft delete works through `deleted_at` for owned rows.
- [ ] Results and evidence were reviewed before Phase 10 approval.

Any unexpected access is a failure. Stop and review the schema, grants, and policies before continuing.

## 8. Next Step After Phase 9C Passes

After Phase 9C is manually executed, tested, documented, and explicitly approved, plan Phase 10A as minimal push sync:

- Process local pending queue items asynchronously.
- Upsert local wallet/category/transaction changes to Supabase.
- Preserve SQLite-first reads and writes.
- Use soft deletes remotely.
- Do not implement pull sync yet; pull remains Phase 11.

This guide does not approve or start Phase 10A.
