# Phase 11 Hardening and Release Readiness Plan

**Status**: Phase 11E release-readiness cleanup in progress  
**Scope**: Post-MVP sync hardening, QA, and release readiness  
**Architecture**: SQLite remains the runtime source of truth; Supabase remains remote persistence for authenticated backup and multi-device sync

**Current QA caveat**: Phase 11D.1, 11D.2, and 11D.5 have passed manual QA. Phase 11D.3 two-device convergence and 11D.4 expired-session behavior are deferred and not considered passed.

## Executive Summary

Phase 10 completed the full manual sync MVP: remote repositories, push sync, pull sync, LWW convergence, manual `Sync Now` UI, retry behavior, and demo readiness. Phase 11 does not reimplement pull sync or conflict handling. Its purpose is to harden the completed MVP through focused review, manual QA, release-readiness cleanup, and demo preparation before later product polish or automated test phases.

## Goals

- Confirm Phase 10 sync behavior is stable enough for post-MVP release readiness.
- Review sync cursor, retry, stale queue, duplicate replay, and user-facing error behavior.
- Validate data integrity after sync for wallets, categories, transactions, transfers, tombstones, and app restarts.
- Verify offline/online manual sync flows across realistic device and account scenarios.
- Remove obsolete documentation wording and temporary development artifacts.
- Prepare a concise demo script and release checklist.

## Non-Goals

- Do not implement the legacy Phase 11 pull-sync checklist.
- Do not change runtime financial formulas, dashboard calculations, or report calculations.
- Do not change SQLite schema or Supabase SQL.
- Do not add dependencies.
- Do not add background sync or automatic app-start sync.
- Do not implement Phase 12 settings/UX polish.
- Do not implement Phase 13 automated tests.
- Do not add advanced conflict-resolution UI.

## Preconditions From Phase 10

- Phase 10A remote repositories are implemented and manually verified.
- Phase 10B push sync is implemented and manually verified.
- Phase 10C pull sync is implemented and manually verified.
- Phase 10D conflict/convergence is implemented and manually verified.
- Phase 10E manual `Sync Now` UI, retry, and demo readiness are implemented and manually verified.
- Phase 10 manual verification passed:
  - `npx tsc --noEmit`: PASS
  - Sync Now verified.
  - Offline behavior verified.
  - Retry verified.
  - User isolation verified.
  - No hard delete verified.
  - `last_sync_at` behavior verified.

## Active Phase 11 Subphases

### 11A - Planning and Phase 10 Closure Documentation

Documentation only.

- Close Phase 10 in `tasks.md`.
- Supersede the legacy Phase 11 checklist.
- Create this Phase 11 hardening and release-readiness plan.
- Do not change runtime code, schema, SQL, dependencies, or formulas.

### 11B - Sync Hardening Review

Review existing Phase 10 implementation without adding new product behavior unless separately approved.

- Review `last_sync_at` success-only advancement.
- Review overlap-safe pull lower-bound behavior.
- Review manual retry behavior for pending and failed local queue entries.
- Review stale `processing` queue recovery.
- Review duplicate queue and replay idempotency behavior.
- Review safe user-facing sync messages.
- Review logging for auth, network, RLS, remote, and partial-cycle failures.

### 11C - Data Integrity QA

Manual QA focused on correctness after sync.

- Validate wallet CRUD after sync.
- Validate category CRUD after sync.
- Validate transaction CRUD after sync.
- Validate transfers after sync.
- Validate dashboard and report formulas remain unchanged.
- Validate tombstones are preserved and no hard delete occurs.
- Validate app restart persistence after successful and failed sync attempts.

### 11D - Offline/Online Release Checklist

Manual release-flow checklist.

- Offline create, edit, and delete.
- Reconnect and run `Sync Now`.
- Two-device convergence.
- Expired session behavior.
- RLS/user isolation.
- Retry after network or remote failure.
- Confirm queue counts and last-sync display remain understandable.

### 11E - Release Readiness Cleanup

Cleanup and demo preparation.

- Remove obsolete documentation wording.
- Ensure no temporary DEV buttons, scripts, or debug-only sync triggers remain.
- Ensure `.env.example` is safe and contains placeholders only.
- Ensure no secrets or local test files are committed.
- Ensure lint/typecheck checklist is documented.
- Prepare a short manual demo script.

## Manual QA Checklist

- [ ] Wallet create/edit/delete remains local-first and syncs correctly.
- [ ] Category create/edit/delete remains local-first and syncs correctly.
- [ ] Income and expense transactions sync correctly.
- [ ] Transfers sync correctly and preserve wallet relationships.
- [ ] Dashboard totals and report summaries remain formula-compatible with pre-Phase 11 behavior.
- [ ] Soft deletes remain tombstones locally and remotely.
- [ ] App restart preserves local SQLite state and sync metadata.
- [ ] Failed sync does not delete local data.
- [ ] Retry succeeds after network or remote recovery.

## Release Readiness Checklist

- [ ] `npx tsc --noEmit` result documented.
- [ ] Lint result documented if run.
- [ ] Manual Android runtime smoke test documented if run.
- [ ] `.env.example` reviewed for placeholder-only values.
- [ ] No real secrets committed.
- [ ] No temporary DEV sync UI remains.
- [ ] No temporary local test files are committed.
- [ ] Demo script prepared.
- [ ] Known risks documented before release.

## Risk List

- Timestamp overlap replay must remain idempotent to avoid duplicate local rows.
- Manual retry can repeatedly surface the same invalid local queue item until the underlying data issue is fixed.
- Client clock skew can still affect LWW conflict outcomes.
- Equal-timestamp mismatches remain an MVP limitation without manual conflict UI.
- User-facing messages must stay safe and not expose Supabase, SQL, or stack details.
- Release readiness can be overstated if manual QA evidence is not recorded with dates and commands.

## Rollback Strategy

- Phase 11A is documentation-only; rollback is limited to reverting documentation edits.
- For later Phase 11 subphases, keep code changes small and separately reviewable.
- If a hardening change regresses sync behavior, revert that change and preserve Phase 10 verified behavior.
- Do not use hard deletes or schema changes as rollback mechanisms.
- Preserve local SQLite data and retryable `sync_queue` entries during rollback.

## Definition of Done

- Phase 10 is clearly marked verified and closed in project documentation.
- The legacy Phase 11 pull-sync checklist is clearly superseded.
- The active Phase 11 subphases are documented and scoped.
- Manual QA and release-readiness checklists are available.
- Risks and rollback strategy are documented.
- No runtime code, SQLite schema, Supabase SQL, dependencies, dashboard formulas, or report formulas changed during Phase 11A.
