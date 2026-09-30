# Deployment notes

## Device-only preview

Device mode runs without environment variables or a hosted database. Deploying a preview does not enable cloud accounts, payments, or shared data. A new domain has separate browser storage; use JSON export/import to move a journal.

Build with `npm ci` and `npm run build`. A self-hosted deployment needs a reverse proxy for HTTPS; the current `npm start` binds to `127.0.0.1`. Review the host's runtime, bandwidth limits, and commercial-use terms before choosing a plan.

## Optional Supabase journal

1. Review and apply `supabase/migrations/001_training.sql` to your own project.
2. Copy `.env.example` to `.env.local`. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (public publishable/anon key), and `APP_ORIGIN` (exact application origin). These are server-only settings; do not use a service-role key. Set an HTTPS origin in production.
3. Configure email OTP, allowed URLs, delivery, and rate limits. The email template must include `{{ .Token }}` for code entry.
4. Test sign-in, expired codes, sign-out, recovery, and isolation between two real accounts.
5. Verify concurrent writes and save-failure recovery before enabling cloud mode publicly.

Cloud and device journals remain separate; moving data requires explicit export/import. The cloud adapter stores a versioned snapshot with optimistic concurrency and a 2 MB payload cap. Larger workloads will need normalized records and incremental queries.

## Security boundaries

- Device mode is storage, not authentication. Local backups and clocks are editable.
- The browser uses same-origin API requests. Supabase access/refresh tokens stay in SDK-managed HttpOnly cookies, never API JSON or localStorage. Production cookies use `Secure`, `SameSite=Lax`, `Path=/`, and the `__Host-` prefix. Their browser lifetime is seven days; provider session policies also apply.
- Each authenticated request creates a separate server client and verifies the user through Supabase `getUser()`. Expired access tokens refresh server-side. Auth/journal responses are private and non-cacheable; do not override this at a CDN.
- Mutations require an exact `APP_ORIGIN`, a custom request header, and JSON. The journal API ignores client identity for authorization and checks the expected account against the verified user to prevent cross-tab account-switch writes.
- OTP attempts have bounded per-process throttles plus provider rate limits. Before a multi-instance public launch, configure durable gateway/WAF limits and provider CAPTCHA/SMTP settings. In-memory throttles alone are not a distributed anti-abuse service.
- Sign-out revokes the current provider session, clears its cookies and private drafts, and notifies other tabs. Pending saves block intentional sign-out; expired-session edits stay available for recovery without being written to another account.
- Database access derives the user from the authenticated session. Journal writes use a revision-checked function; client writes to entitlements and payment events are blocked.
- Bond points and local unlocks are not payment authority. Billing interfaces and ownership tables are scaffolding only; no checkout or payment webhook is implemented.
- Gifts are applied once before animation playback. Skipping or closing the animation does not create another grant.
- Legacy whey history migrates to the previously equipped avatar because older records did not identify recipients.

## Release checklist

- [ ] Run unit tests, type checking, production build, and browser checks on the hosted preview.
- [ ] Review production dependencies, HTTPS, security headers, CSP, and deployed origin/cookie behavior.
- [ ] Validate live auth, account deletion, privacy consent, retention, backups, and recovery.
- [ ] Move rewards and paid ownership to server-authoritative, idempotent operations before monetization.
- [ ] Replace or review prototype anatomy assets and exercise animations; confirm publication rights for all assets.
- [ ] Review accessibility, mobile performance, error reporting, and hosting costs.

## Drafts and verification

Workout and profile drafts are schema-validated localStorage entries, scoped by guest/device/account and form. They expire after seven days, can be discarded, and clear only after the journal save succeeds. They are not encrypted or cloud-synced; use a trusted browser. Signing out clears that cloud account's local drafts without deleting its saved journal.

`npm run test:auth` runs the production API and UI against a mock Supabase service on a separate local port. It covers OTP rejection, cookie attributes, refresh, CSRF guards, identity checks, save/reload, conflicts, sign-out, and provider outages. The mock is test code only. Real email delivery, SQL/RLS enforcement, and two-account isolation in PostgreSQL must still be verified on your Supabase project.

The cookie adapter follows the [Supabase server-side guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide). ATLAS deliberately uses a server-only auth client so browser code does not need token access.

## Content and assets

Exercise descriptions paraphrase *Functional Anatomy for Strength Training*; source pages are recorded in `src/domain/catalog.ts`. The full PDF is not bundled. Equipment and location tags are app classifications.

Anatomy figures, Greek busts, and movement studies are procedural illustrations, not certified technique demonstrations. They need trainer review before public release. The logo is the project-approved asset; fonts are self-hosted through Fontsource.

BMI does not measure muscle mass. TDEE uses the Mifflin–St Jeor resting-energy equation with app-selected activity factors and is an estimate, not a calorie prescription. Avatar appearance does not infer physique from BMI.
