# Backerkit XLSX test fixtures

Committed files under this folder are ready to upload in Sales → add record → Backerkit Import (after `npm run db:seed`). If you change Kickstarter tags in `src/prisma/seed.ts`, regenerate with `npx tsx scripts/generate-backerkit-xlsx-fixtures.ts` (or `npm run generate:backerkit-fixtures`).

## Seeded Kickstarter tags (Becky Chambers, pre-release books)

| Book | ISBN-13 | Ebook tag | Print tag |
|------|---------|-----------|-----------|
| Wayfarers Book Five (pre-release) | 9780999999001 | `ebook-seed-wayfarers-five` | `print-seed-wayfarers-five` |
| Untitled Novella (pre-release) | 9780999999002 | `ebook-seed-novella-qa` | `print-seed-novella-qa` |

## Files

| File | Intent |
|------|--------|
| `sample_backerkit_valid_rollup.xlsx` | Multiple rows aggregate into rolled-up Kickstarter rows (same month/book/format). Uses `imported` / `collected` pledge rows. |
| `sample_backerkit_pledge_mixed.xlsx` | One successful row + one **failed** pledge (non-imported); failed row number should appear in the “unsuccessful Pledge Status” summary. |
| `sample_backerkit_unknown_swag.xlsx` | Non-book tag `swag-sticker-seed-qa` (warning list) plus a valid book tag in the same row. |
| `sample_backerkit_two_sheets.xlsx` | Two worksheets; the importer reads the **first** sheet only (`SheetNames[0]`). |
| `sample_backerkit_no_valid_sales.xlsx` | Only failed pledges and/or unknown tags — expect **no** pending sales added. |
| `sample_backerkit_invalid_extra_column.xlsx` | Unsupported header `Notes` — validation error (unsupported column). |

Manual test: Sales → add record → **Backerkit Import**, upload these files after `npm run db:seed`.

An older ad hoc `valid_backerkit.xlsx` may also be present; use the `sample_backerkit_*` files for reproducible QA tied to the current seed tags.
