# Municipal Cemetery — Hinigaran

A public cemetery records website based on Cemetery_System_FINAL (4).xlsx and VBA_Paste_All (1).txt.

- Original burial, exhumation, transfer and statement layouts and signature blocks.
- Live workbook calculations, senior discount, arrears, previous balance and renewable due dates.
- Save form retains drafts. Transfer appends a numbered Municipal or Aranda record and clears the same input fields as VBA.
- Durable D1 records, editable receipts and transmittals, missing O.R. reminders and annual/monthly reports.
- Print uses Letter (8.5 × 11 inch) portrait permits and landscape transmittal reports. Saved permits retain their original transaction date.

The workbook's existing record and form values are retained. The rental-column amount and total payable use their original distinct formulas. Corrections: exhumation/transfer timestamps are stored separately from the balance column; fixed sample names, dates and receipt values in permits now follow entered details.

`lib/workbook.json` contains the source text, formulas, field labels and extracted formatting. `lib/model.ts` owns calculations and VBA-equivalent transfer rules. `app/api/cemetery/route.ts` implements persistence, numbering, idempotency and conflict protection. `drizzle` contains the database migration.


The dashboard follows the supplied purple design, with a sidebar, generated decorative cemetery backdrop, actual-data KPI cards, monthly collection/transaction chart, monthly details, collection breakdown and record follow-up. No reference sample files or dashboard figures are seeded. Daily cumulative reports, separate Municipal/Aranda views, mobile layouts, dark mode and seasonal themes remain available.

File Records lists existing attachments for viewing, downloading and confirmed deletion; upload controls and the dashboard upload panel have been removed. Files use the managed R2 BUCKET binding declared in `.openai/hosting.json`. Viewing and downloading are public; delete does not require a password. File deletion requires confirmation. Existing D1 cemetery data and workflows remain unchanged. The backdrop asset and its image-generation prompt are documented in `public/assets/README.md`.


Access: the opening screen offers Guest or Admin. Guests may enter/save forms, preview/print permits, use themes and file records, and view aggregate summaries. They cannot transfer forms, open either transmittal or modify transmittal records. Admin accounts `gena` and `marv` have full access after login. Use the top-bar account button or Settings to switch accounts or continue as Guest. Choosing Guest revokes the current Admin session. Login sessions last 12 hours; failed attempts are rate-limited. The previous shared transmittal-password flow and ChatGPT password-management requirement are removed. Existing records are preserved.

Admin account creation seeds only salted PBKDF2 hashes on the server in D1, and uses opaque HttpOnly/Secure cookies. Account/session tables are created automatically without replacing records or drafts. Public dashboards/daily reports receive aggregates without individual transmittal record details. Initial transmittal seed data and account hashes stay server-only.

The statement Clerk dropdown offers GENAFER DELA CRUZ and MARVIN MIRALLES. Login as `gena` selects GENAFER DELA CRUZ; login as `marv` selects MARVIN MIRALLES. The selection updates the live preview and printable statement and is stored with transferred statements. Each active session retains its own clerk selection while other windows update the shared draft.

Transmittal cell widths, font sizes and row heights are reduced by approximately 15% for a denser screen view. Mobile editing keeps 16px text inside the active input. Letter printing is unchanged. Row entrances, live-status pulses and subtle sidebar motion respect reduced-motion preferences, the Animations setting and hidden browser tabs.

Dashboard renewal-due and 90-day indicators are removed from the overview, follow-up list and printable summary. Stored renewal dates and original permit calculations are preserved. The login card uses a separate blurred backdrop, clear solid controls and lightweight entrance/ambient motion; reduced-motion and Animations settings remain respected.

File Records and Attached Files are removed from the site navigation and page views. Existing storage is preserved. The site has its own Comment button: guests/admins can leave comments, and admins can review the latest comments. The platform-provided Request edit toolbar label is outside the site code. Account/login popups explicitly blur the underlying page; layered moving ribbons and highlighted Admin actions make the choice clearer.
