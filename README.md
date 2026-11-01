# Budget Month

A Next.js App Router budgeting application with Supabase Auth and per-user budget data.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL`. These are read only by server-side code, so they intentionally have no `NEXT_PUBLIC_` prefix. The Supabase publishable key is designed to be public, but this app does not need to expose it to browser JavaScript. Never use a secret/service-role key here.
3. Apply every unapplied SQL migration in `supabase/migrations/`, in filename order, using the Supabase SQL Editor. If you have initialized and linked the Supabase CLI for this project, you can instead run `supabase db push`. If you already applied the first migration, apply the newer `save_budget_month` migration too.
4. In Supabase Authentication settings, enable email/password sign-in and email confirmation. Add `http://localhost:3000/auth/confirm` and your production `/auth/confirm` URL to the allowed redirect URLs.
5. Run `npm run dev`.

The app supports email/password sign-up, email confirmation, sign-in, and sign-out. Sessions use secure Supabase SSR cookies. `proxy.ts` refreshes sessions and redirects unauthenticated page/API requests; server data access also verifies signed claims. Budget tables enforce ownership with Row Level Security, so a user can only read or modify their own months and items.

The `/api/months` endpoints are the data boundary used by the UI. Reads are scoped to the signed-in user, and month creation and edits use authenticated database functions. Budget changes are saved together atomically when you choose **Save changes**. No service-role key is needed by this application.
