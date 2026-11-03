# Budget Month

A budgeting monorepo with a Next.js web app, an Expo mobile app, and shared Supabase migrations.

## Repository structure

- `apps/web` — Next.js App Router app, deployable to Vercel.
- `apps/mobile` — Expo React Native app, buildable with EAS.
- `supabase/migrations` — database migrations used by both apps.

## Local setup

1. Use Node.js 24.3 or later in the 24.x line (the Expo SDK does not support Node 25), then install dependencies from the repository root with `npm install`.
2. Create a Supabase project.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL`. These are read only by server-side code, so they intentionally have no `NEXT_PUBLIC_` prefix. The Supabase publishable key is designed to be public, but this app does not need to expose it to browser JavaScript. Never use a secret/service-role key here.
4. Apply every unapplied SQL migration in `supabase/migrations/`, in filename order, using the Supabase SQL Editor. If you have initialized and linked the Supabase CLI for this project, you can instead run `supabase db push`. If you already applied the first migration, apply the newer `save_budget_month` migration too.
5. In Supabase Authentication settings, enable email/password sign-in and email confirmation. Add `http://localhost:3000/auth/confirm` and your production `/auth/confirm` URL for the web app, and `budgetmonth://auth/callback` for mobile email confirmation.
6. To run mobile locally, copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the same Supabase project values. These are client-side values; never put a service-role key in the mobile app. Add the current Expo Go callback URL to Supabase's allowed redirect URLs when testing sign-up in Expo Go.
7. Start the web app with `npm run dev:web`, or start Expo with `npm run dev:mobile`.

The Expo app supports email/password sign-in and sign-up, email confirmation deep links, account management, month creation/deletion, and editing monthly budgets. It uses native secure storage for auth sessions, and reads/writes the same user-owned Supabase data under Row Level Security as the web app.

## Commands

- `npm run dev:web` — start Next.js.
- `npm run build:web` — build the web app.
- `npm run dev:mobile` — start Expo.
- `npm run android` / `npm run ios` — start Expo for a native device or emulator. iOS simulator builds require macOS.
- From `apps/mobile`, run `npx expo export --platform web` to build the Expo web target.
- `npm run lint` — check the repository with Biome.

For Vercel, set the web project's Root Directory to `apps/web`. Keep the npm lockfile and workspace manifest at the repository root so Vercel can install the workspace dependencies.

The web app supports email/password sign-up, email confirmation, sign-in, and sign-out. Sessions use secure Supabase SSR cookies. `proxy.ts` refreshes sessions and redirects unauthenticated page/API requests; server data access also verifies signed claims. Budget and account tables enforce ownership with Row Level Security, so a user can only read or modify their own data. Accounts can be added from the dashboard and edited or removed there, then saved together.

The `/api/months` endpoints are the data boundary used by the UI. Reads are scoped to the signed-in user, and month creation and edits use authenticated database functions. Budget changes are saved together atomically when you choose **Save changes**. Income and expense items can have an optional scheduled date. No service-role key is needed by this application.

The current calendar month's **Total Equity** balances stay in sync with account balances. You can update or delete balances from the month page, or manage accounts from the dashboard. Liabilities appear as negative balances in Total Equity. **Equity Change** compares each month's equity with the previous available month's snapshot. Past months remain historical snapshots. To protect these comparisons, only the oldest past month and newest future month can be deleted. Apply all migrations in order, including `20261031000003_sync_current_month_equity.sql`, `20261031000004_equity_changes_and_deletions.sql`, `20261031000005_create_previous_budget_month.sql`, `20261031000006_delete_edge_budget_month.sql`, `20261031000007_fix_current_month_equity_sync.sql`, and `20261031000008_budget_item_dates.sql`.
