# Deployment notes

## Device-only preview

Device mode runs without environment variables or a hosted database. Deploying a preview does not enable cloud accounts, payments, or shared data. A new domain has separate browser storage; use JSON export/import to move a journal.

Build with `npm ci` and `npm run build`. A self-hosted deployment needs a reverse proxy for HTTPS; the current `npm start` binds to `127.0.0.1`. Review the host's runtime, bandwidth limits, and commercial-use terms before choosing a plan.

## Optional Supabase journal

1. Review and apply `supabase/migrations/001_training.sql` to your own project.
2. Copy `.env.example` to `.env.local` and set the project URL and public anon/publishable key. Never expose a service-role key through `NEXT_PUBLIC_` variables.
3. Configure email OTP, allowed URLs, delivery, and rate limits. The email template must include `{{ .Token }}` for code entry.
4. Test sign-in, expired codes, sign-out, recovery, and isolation between two real accounts.
5. Verify concurrent writes and save-failure recovery before enabling cloud mode publicly.

Cloud and device journals remain separate; moving data requires explicit export/import. The cloud adapter stores a versioned snapshot with optimistic concurrency and a 2 MB payload cap. Larger workloads will need normalized records and incremental queries.

## Security boundaries

- Device mode is storage, not authentication. Local backups and clocks are editable.
- The optional auth adapter uses browser-managed Supabase sessions, not an HttpOnly-cookie server session. Cloud integration has not been live-tested.
- Database access derives the user from the authenticated session. Journal writes use a revision-checked function; client writes to entitlements and payment events are blocked.
- Bond points and local unlocks are not payment authority. Billing interfaces and ownership tables are scaffolding only; no checkout or payment webhook is implemented.
- Gifts are applied once before animation playback. Skipping or closing the animation does not create another grant.
- Legacy whey history migrates to the previously equipped avatar because older records did not identify recipients.

## Release checklist

- [ ] Run unit tests, type checking, production build, and browser checks on the hosted preview.
- [ ] Review production dependencies, HTTPS, security headers, CSP, and the session/CSRF strategy.
- [ ] Validate live auth, account deletion, privacy consent, retention, backups, and recovery.
- [ ] Move rewards and paid ownership to server-authoritative, idempotent operations before monetization.
- [ ] Replace or review prototype anatomy assets and exercise animations; confirm publication rights for all assets.
- [ ] Review accessibility, mobile performance, error reporting, and hosting costs.

## Content and assets

Exercise descriptions paraphrase *Functional Anatomy for Strength Training*; source pages are recorded in `src/domain/catalog.ts`. The full PDF is not bundled. Equipment and location tags are app classifications.

Anatomy figures, Greek busts, and movement studies are procedural illustrations, not certified technique demonstrations. They need trainer review before public release. The logo is the project-approved asset; fonts are self-hosted through Fontsource.

BMI does not measure muscle mass. TDEE uses the Mifflin–St Jeor resting-energy equation with app-selected activity factors and is an estimate, not a calorie prescription. Avatar appearance does not infer physique from BMI.
