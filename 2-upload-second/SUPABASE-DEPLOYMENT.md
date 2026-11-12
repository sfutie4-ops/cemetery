# Hinigaran Cemetery: free hosting setup

Status: application converted and production build passed. Not deployed. No live cemetery records have been imported into the new project; the transfer requires explicit approval. The source website and its hourly Google Sheets backup are unchanged.

## Selected services

- Supabase project: Hinigaran Cemetery (`zppgviwcecljpoakmvpi`), Singapore, existing Free organization. No paid features enabled.
- Website host: Netlify Free. Use its supplied `netlify.app` address. Do not select a trial, paid plan, custom domain purchase, add-ons, or auto recharge. On Free, reaching the credit limit pauses sites.
- The app uses standard Next.js on Node, PostgreSQL, and Supabase Storage. It has no runtime ChatGPT dependency.

## Required server configuration

Set these in the website host's environment-variable settings, never in browser code or chat:

- `DATABASE_URL`: Supabase Connect → Transaction pooler connection string, port 6543, for this project. Supply its database password through the provider's secret settings. The app uses verified TLS, two connections per instance, and disables prepared statements for transaction pooling.
- `SUPABASE_URL`: `https://zppgviwcecljpoakmvpi.supabase.co`
- `SUPABASE_SECRET_KEY`: server secret key from this project's API-key settings, for the retained file API. Never use a `NEXT_PUBLIC_` name.

The `cemetery` schema has been created. Its tables have RLS enabled and no public grants or policies. Use an authorized server database role; the public Supabase API cannot access these tables. A private `cemetery-files` Storage bucket must be created before the optional file API can be verified. No stored attachments have been copied.

## Migration pending approval

Copy the 16 active records, 5 online drafts, comment/history data, and deletion markers using a fresh complete source read. Do not copy session tokens or password tables. Preserve exact payload strings, IDs, numbers, timestamps, revisions, receipt zeros, and phone zeros. Generate new internal transfer keys for imported records.

The attempted import was rejected by automatic approval review, and no records or drafts were imported. Verify counts and exact values after an approved import. Refresh the snapshot immediately before final cutover; keep the old website intact until verification passes.

Admin account provisioning remains pending. Do not assume old live passwords have been migrated. The source's fallback password-check constants do not provision accounts.

Comments use an atomic PostgreSQL statement, so repeated saves cannot move an existing pin. Form transfers use a transaction-scoped write lock to prevent duplicate numbering. Background refresh is 30 seconds while visible; explicit saves are immediate. The existing printed forms and layout are unchanged.

## Validation

- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm test`
- Execute `scripts/test-postgres.sql` against the new schema: checks optimistic revision conflicts, record numbering, receipt/mobile zeros, and idempotent comment pins, with a final rollback.
- Test real login, cross-window conflict handling, create/edit/delete/transfers, and optional file operations after configuring secrets. Browser visual testing and deployed endpoint verification have not been performed.

The existing Google Sheets automation continues backing up the original D1 website. It does not automatically follow the Supabase copy; change its source only after the new site is accepted and a supported read path is configured.
