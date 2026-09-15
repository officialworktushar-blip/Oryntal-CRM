# Oryntal CRM

A role-based lead CRM for **Oryntal** — the AI & Web Agency — built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase (Auth, Postgres, Row Level Security).

Three roles:

| Role | Access |
| --- | --- |
| `super_admin` | Everything: manage all users, all leads + CSV import/reassign, company-wide analytics. Cannot be modified or deleted by anyone. |
| `admin` | Manage all leads (create, CSV import, assign to interns), view all leads and all intern activity, create intern accounts. Cannot manage other admins or the super admin. |
| `intern` | Only leads assigned to them. Update status, log call/email/WhatsApp/meeting/note activities, today's follow-ups. Cannot see other interns' leads, cannot delete. |

---

## 1. Setup

### Prerequisites

- Node.js 18.17+ (22 recommended)
- A Supabase project ([supabase.com](https://supabase.com)) — free tier is fine
- Supabase CLI (optional, for applying migrations from the repo)

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url          # e.g. https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key        # project → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # server-only; NEVER expose to the browser
```

> The service role key is only read inside `src/lib/supabase/admin.ts`, which
> imports `server-only` so it can never end up in the client bundle.

### Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

## 2. Database migrations

The schema lives in `supabase/migrations/`. Apply it with the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or paste `supabase/migrations/20250101000000_initial_schema.sql` into the
Supabase **SQL Editor** and run it (works either way).

The migration creates:

- **Enums** — `user_role`, `lead_status`, `activity_type`
- **Tables** — `profiles`, `leads`, `lead_activities`, `notifications`
- **RLS policies** enforcing every role rule (see below)
- **Triggers** —
  - `handle_new_user`: auto-creates a `profiles` row (role `intern`) when a Supabase Auth user signs up
  - `set_updated_at`: keeps `leads.updated_at` fresh
  - `notify_on_lead_assigned`: pings the intern when a lead is assigned
  - `notify_on_status_change`: pings the creating admin/super admin when a lead becomes `converted` or `lost`
- **RPC helpers** — `update_lead_status()` and `log_lead_activity()` run inside a single transaction (`security invoker`, so RLS still applies).

### Row Level Security summary

| Table | super_admin | admin | intern |
| --- | --- | --- | --- |
| `profiles` | full CRUD | read/update **non-super-admin** rows; insert interns only; never other admins | own row only |
| `leads` | full CRUD | full CRUD | select/update where `assigned_to = auth.uid()` |
| `lead_activities` | full CRUD | full CRUD | select own leads' activities; insert only on own leads |
| `notifications` | all (via admin insert) | all | own rows; mark read |

Plus a trigger that hard-blocks `DELETE FROM profiles WHERE role = 'super_admin'`.

## 3. Creating the first super_admin

There is **no public sign-up page** — accounts are only created by admins
through the UI or directly in Supabase. To bootstrap your very first super
admin:

**Option A — Supabase dashboard (easiest)**

1. Supabase → **Authentication → Users → Add user**
2. Enter the email/password (e.g. `boss@oryntal.agency`). A `profiles` row is created automatically with role `intern`.
3. Open the **SQL Editor** and promote them:

```sql
update public.profiles
set role = 'super_admin', is_active = true
where email = 'boss@oryntal.agency';
```

4. Sign in at `/login` with those credentials.

**Option B — SQL only**

```sql
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'boss@oryntal.agency',
  crypt('ChangeMe_Strong123!', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- find the user id and promote
update public.profiles p
set role = 'super_admin'
from auth.users u
where u.email = 'boss@oryntal.agency' and u.id = p.id;
```

After the first super_admin exists, you can create every other admin/intern
from the **Team** tab in the app (it creates the auth user + profile for you).

## 4. How it works

- **Architecture** — pages are Async Server Components that fetch through the
  server-side Supabase client (`src/lib/supabase/server.ts`) using the session
  cookie. Mutations go through Route Handlers under `src/app/api/*`; the same
  RLS-governed client is used, plus a `server-only` service-role client purely
  for `auth.admin.createUser`.
- **Middleware** (`middleware.ts`) refreshes the session, sends unauthenticated
  users to `/login`, redirects logged-in users to their role dashboard, and
  locks each `/super-admin`, `/admin`, `/intern` route to its role. Role checks
  are repeated **server-side** in every page/layout (`src/lib/auth.ts`).
- **Lead detail** (`/leads/[id]`) — interns only see leads assigned to them
  (RLS + server check). Status changes automatically append a `status_change`
  activity; the "Log activity" form can also set the next follow-up date.
- **CSV import** — available to admin/super_admin (team → leads tab / admin →
  leads tab). Parse happens client-side for a preview step, then rows are bulk
  inserted as unassigned leads.
- **Notifications** — in-app bell (desktop top-right / mobile header). Interns
  are notified on assignment; admins/super admins on `converted`/`lost`.

## 5. Branding

Brand tokens live in `src/lib/constants.ts` (`BRAND`) and `tailwind.config.ts`.

- **Primary:** `#0d1230` (Oryntal navy)
- **Accent:** `#c9a84c` (Oryntal gold, gradient `#8b6914 → #c9a84c → #f0d080`)
- **Background:** `#F8F9FA`
- **Fonts:** Outfit (UI) + Cormorant Garamond (display headings), loaded via `next/font`.

To swap in the real logo: drop `logo.png` into the `/public` folder — the
`BrandLogo` component (`src/components/brand/logo.tsx`) automatically picks it
up and falls back to a gold monogram otherwise. You can also edit the `BRAND`
object to change brand colours in one place (and the matching tokens in
`tailwind.config.ts`).

## 6. Security notes

- Supabase keys are only ever read from environment variables; `.env` is gitignored.
- The service role key is `server-only` — never import `admin.ts` from a client component.
- RLS is the source of truth; the app's route handlers add defense-in-depth checks but never bypass policies (except triggering auth-user creation, which inherently requires the service role).
- Roles can be changed and accounts deactivated from the Team tab. Deactivated accounts lose access immediately (middleware + RLS both require `is_active = true`).