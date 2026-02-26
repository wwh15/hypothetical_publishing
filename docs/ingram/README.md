# Ingram Spark CSV sample files for validation testing

Use these with the **Sales → Add record** flow (paste/upload Ingram CSV) and the month/year prompt. Each file targets one validation check.

| File | Validation check | Expected result |
|------|------------------|-----------------|
| `sample_ingram_valid.csv` | Valid file | Passes validation; preview then commit. |
| `sample_ingram_valid_with_bom.csv` | UTF-8 BOM at start (e.g. Excel export) | Treated as valid; BOM ignored. |
| `sample_ingram_invalid_wrong_columns.csv` | Wrong column count (7 instead of 9) | Error: expected 9 fields, found 7 (with line number). |
| `sample_ingram_invalid_returns.csv` | Returned Qty = 1 (non-zero) | Error: Returned Qty is expected to be set to 0. |
| `sample_ingram_invalid_net_not_gross.csv` | Gross 10, Returned 0, Net 9 (Net ≠ Gross) | Error: Net Qty must equal Gross Qty. |
| `sample_ingram_invalid_unknown_isbn.csv` | ISBN 9780000000000 (not in system) | Error: Book not found in library. |
| `sample_ingram_invalid_format.csv` | Format = "eBook" | Error: Format must be "Paperback" or "Hardcover". |
| `sample_ingram_invalid_format_hardback.csv` | Format = "Hardback" (typo) | Same format error. |
| `sample_ingram_invalid_non_numeric.csv` | Gross Qty = "ten" (non-numeric) | Error: Not a valid number (or similar). |

**Note:** Valid and unknown-ISBN files use ISBNs from the seed. Run `npm run db:seed` so **Ingram Test Book** (9780599999999) exists; 9780000000000 is intentionally not in the seed.
