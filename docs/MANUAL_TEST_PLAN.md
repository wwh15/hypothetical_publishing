# Hypothetical Publishing — Manual Test Plan

This test plan uses **fully deterministic seed data**. Every step that involves a book or sale tells you exactly which one to click. Run the seed once, then follow the steps.

## Prerequisites

- Apply migrations: `npx prisma migrate deploy` (or `npx prisma db push` for dev).
- Run the seed: `npm run db:seed` or `npx prisma db seed`.
- Complete `/setup` and log in as admin.

---

## Seed Data Quick Reference

After seeding you will have:

| Type | Names / How to find them |
|------|---------------------------|
| **Authors** | **Test Author**, **Orphan Author**, Alice Johnson, Bob Smith, Carol Williams |
| **Series** | **Starship Saga** (2 books), **Mystery Hollow** (1 book) |
| **Books** | **Ingram Test Book** (ISBN 9780599999999), **No-Sales Book** (0 sales), **Starship Dawn**, **Starship Exodus**, **Mystery at the Hollow**, **Standalone One**, **Archive Vol 1**, **Legacy Vol 1**, **Perspective Vol 1**, **Chronicle Vol 1**, **Pagination Book 11** … **Pagination Book 21** (21 total for pagination) |
| **Sales** | **Ingram Test Book**: Jan 2025 Distributor Paid, Feb 2025 Handsold Unpaid. **Starship Dawn**: Jan 2025 Distributor Paid, Feb 2025 Handsold Unpaid, Mar 2025 Distributor Unpaid. **Starship Exodus**: Feb 2025 Distributor Unpaid. **Mystery at the Hollow**: Nov 2024 Distributor Paid, Jan 2025 Handsold Unpaid. Others: one sale each. **No-Sales Book**: no rows. |

---

## 1. Server & Security

### 1.1 Install/Setup and Admin User

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 1.1.P | First-time setup | Open `/setup`. Create admin username `admin` and password. Submit. | Redirect to login or home. |
| 1.1.N | Setup when already configured | With at least one user, open `/setup`. | Redirect to `/login` or `/`. |

### 1.2 Access Control

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 1.2.P | Login | From `/login`, enter `admin` and correct password. Submit. | Redirect to `/books`. |
| 1.2.N | Wrong password | From `/login`, valid username, wrong password. Submit. | Error; stay on login. |
| 1.2.N2 | Unauthenticated protected routes | Logged out, open `/books`, `/books/1`, `/sales`, `/sales/add-record`, `/sales/payments`, `/sales/records/1`. | Redirect to `/login` each time. |
| 1.2.N3 | Unauthenticated authors/reports | Logged out, open `/authors`, `/reports`, `/reports/author-royalty`. | If protected: redirect to login; else document. |

### 1.3 Passwords and Logout

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 1.3.P | Change password | Log in → Change password (nav). Current password, new password twice (match). Submit. | Success; can log in with new password. |
| 1.3.N | New passwords don’t match | Current password, new password, different confirm. Submit. | Validation error. |
| 1.3.P2 | Logout | Click Logout. | Session ended; `/books` or `/sales` redirect to login. |

### 1.4 Persistence and URLs

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 1.4.P | Bookmark and revisit | Log in → Books → click **Starship Dawn** → copy URL → open in new tab (or re-login and paste). | Same book detail. |
| 1.4.P2 | Safe GET | Open Books, then **Ingram Test Book** detail, then Sales Records. No form submits. | No side effects. |
| 1.4.P3 | Back button | Books → click **No-Sales Book** → browser Back. | Back to book list. |

### 1.5 Pagination

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 1.5.P | Book list pagination | Go to Books. With 21 books and default page size (e.g. 20), use Next page or “Show all”. | First page shows 20 books; next page (or “Show all”) shows remaining 1 (or all 21). Response stays fast. |
| 1.5.P2 | Sales list pagination | Go to Sales Records. Change page or “Show all”. | Same. |
| 1.5.P3 | Author list pagination | Go to Authors. Paginate or show all. | 5 authors. |
| 1.5.P4 | Author payments pagination | Go to Sales → Author Payments. Paginate or show all. | Same. |

---

## 2. Book Management

### 2.1 Book List (Req 2.1)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.1.P | View table | Go to Books. | Table: title, author, series/position, ISBN 13/10, publication, royalty rates, total sales; thumbnails if cover present. |
| 2.1.P2 | Default sort | Open Books (no sort params). | Default: author, then series/position, then title; non-series books last in series column. |
| 2.1.P3 | Sort by fields | Sort by title; then by author; then by series. | Order updates; series sort puts non-series last. |
| 2.1.P4 | Keyword filter | Search “Starship”. Then search “Test Author”. Then “9780599999999”. Then “Mystery Hollow”. | Only matching books. |
| 2.1.P5 | Navigate to detail | Click the row for **Starship Dawn**. | Book detail for Starship Dawn. |
| 2.1.P6 | Begin create | Click “Add book” (or equivalent). | Navigate to book creation. |
| 2.1.N | Empty search | Search “xyznonexistent”. | Empty list or “No results”. |

### 2.2 Book Detail (Req 2.2)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.2.P | View all fields | Go to Books → click **Starship Dawn**. | All fields visible; series “Starship Saga (1)”; no cover unless you added one. |
| 2.2.P2 | Sales on detail | Same book **Starship Dawn**. | Sales table with 3 rows (Jan/Feb/Mar 2025); totals for publisher revenue, unpaid/paid/total author royalty. |
| 2.2.P3 | Create sale from detail | From **Starship Dawn** detail, add a new sales record (link or inline). | Can add record for this book; after save it appears and totals update. |
| 2.2.P4 | Navigate to author | From **Starship Dawn** detail, click link to author (**Test Author**). | Author detail for Test Author. |
| 2.2.P5 | Edit / Delete | From **Standalone One** detail, click Edit; then open Delete (do not confirm yet). | Edit form opens; Delete shows confirmation dialog. |
| 2.2.N | Invalid ID | Open `/books/999999`. | 404 or not found. |

### 2.3 Book Creation (Req 2.3)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.3.P | Create minimal | Add book: title “New Book”, select **Alice Johnson**, ISBN-13 9788888888881, publication Jan 2025, cover price 16.99, print cost 4.00. No series, no cover. Submit. | Created; defaults 50% dist / 20% handsold; redirect to new book. |
| 2.3.P2 | Create with series | Add book: title “Starship Rebirth”, select **Test Author**, choose series **Starship Saga**, position 3. Fill required fields. Submit. | Saved as Starship Saga (3). |
| 2.3.P3 | Optional fields | Add book with ISBN-10 and cover art (JPEG/PNG/GIF/WEBP) if supported. Submit. | All saved; thumbnail on list. |
| 2.3.P4 | Author autocomplete | On create, in author selector type “Test”. | **Test Author** (and **Orphan Author** if match) appear; select **Test Author**. |
| 2.3.N | Duplicate ISBN-13 | Create book with ISBN-13 **9780599999999** (same as **Ingram Test Book**). Submit. | Error; book not created. |
| 2.3.N2 | Duplicate ISBN-10 | Create book with ISBN-10 **0599999999**. Submit. | Error. |
| 2.3.N3 | Series without position | Select series **Mystery Hollow** but leave position blank. Submit. | Validation error. |
| 2.3.N4 | Invalid data | Enter negative cover price or invalid publication. Submit. | Validation errors. |
| 2.3.N5 | Missing required | Omit title (or author, or ISBN-13, or cover price, or print cost). Submit. | Validation errors. |

### 2.4 Book Modification (Req 2.4)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.4.P | Edit fields | Books → **Standalone One** → Edit. Change title to “Standalone One (Revised)”, cover price to 17.99. Save. | Book updated; existing sales unchanged. |
| 2.4.P2 | Remove optional | Edit a book that has series (e.g. **Mystery at the Hollow**). Clear series/position. Save. | Optional cleared. |
| 2.4.P3 | Change royalty rates | Edit **Chronicle Vol 1**. Change distributor rate to 45%, handsold to 25%. Save. | Saved; only future sales use new rates. |
| 2.4.N | Duplicate ISBN on edit | Edit **No-Sales Book**. Set ISBN-13 to **9780599999999**. Save. | Error. |
| 2.4.N2 | Series position conflict | Edit **Starship Exodus** to position 1 (same as **Starship Dawn**). Save. | Constraint or validation prevents invalid positions. |

### 2.5 Book Deletion (Req 2.5)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.5.P | Delete book with no sales | Go to Books → click **No-Sales Book** → Delete. In dialog confirm title/author and “no sales records”. Confirm. | Book deleted; redirect to list; **No-Sales Book** gone. (Re-seed to restore for other tests.) |
| 2.5.P2 | Delete book with sales | Go to Books → click **Starship Exodus** (has 1 sale) → Delete. Confirm dialog shows title/author and note about existing sales. Confirm. | Book and its sales removed (or retained per implementor); behavior stated in dialog. |
| 2.5.N | Cancel delete | Open **Ingram Test Book** → Delete → Cancel (or close dialog). | No deletion; stay on detail. |

### 2.6 Series Behavior (Req 2.6)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 2.6.P | Series disappears when empty | Edit **Mystery at the Hollow** → remove series/position. Edit any other book in **Mystery Hollow** if any; remove. | When no book references Mystery Hollow, that series no longer appears in series lists. |

---

## 3. Sales Record Management

### 3.1 Sales Record Listing (Req 3.1)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 3.1.P | View table | Go to Sales Records. | Columns: book title, author, month/year, quantity, publisher revenue, author royalty, source (distributor/handsold), comment, paid indicator. |
| 3.1.P2 | Default sort | Open Sales Records. | Descending by month/year (newest first). |
| 3.1.P3 | Sort | Sort by book title, then by quantity. | Order updates. |
| 3.1.P4 | Filter date range | Set date from Jan 2025 to Mar 2025. | Only records in that range (e.g. **Ingram Test Book** Jan/Feb, **Starship Dawn** Jan/Feb/Mar, **Starship Exodus** Feb, etc.). |
| 3.1.P5 | Filter by author | Filter by **Test Author**. | Only books by Test Author: Ingram Test Book, Starship Dawn, Starship Exodus. |
| 3.1.P6 | Filter by source | Filter distributor only; then handsold only. | Correct subsets. |
| 3.1.P7 | Navigate from row | Click the row for **Ingram Test Book**, **January 2025**, **Distributor**, **Paid**. Go to record detail or book detail as offered. | Correct page. |
| 3.1.P8 | Open input tool | From Sales Records, use link/button to “Add sale” / sales input tool. | Navigate to input tool. |

### 3.2 Author Payments View (Req 3.2)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 3.2.P | Grouped by author | Go to Sales → Author Payments. | Records grouped by author; per-author unpaid subtotal; sorted by author then desc month/year. |
| 3.2.P2 | Mark all unpaid paid | Find **Test Author**. Click “Mark all paid” (or equivalent). In confirmation dialog, confirm. | All unpaid sales for Test Author marked paid; subtotal updates. |
| 3.2.P3 | Navigate | From a row under **Alice Johnson**, click through to that sales record or to the book. | Correct record or book detail. |
| 3.2.N | Cancel mark paid | Find **Bob Smith**. Click “Mark all paid” → Cancel in dialog. | No change. |

### 3.3 Sales Record Detail/Modify (Req 3.3)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 3.3.P | View all fields | Sales Records → click the row for **Starship Dawn**, **January 2025**, **Distributor**, **Paid**. | All fields visible (month/year, book, quantity, revenue, royalty, source, comment, author paid). |
| 3.3.P2 | Edit distributor record | Open the sale for **Ingram Test Book**, **January 2025**, **Distributor**. Change month to Feb 2025, comment to “Updated.” Save. | Saved; royalty per spec (computed or overridden as implemented). |
| 3.3.P3 | Edit handsold record | Open the sale for **Ingram Test Book**, **February 2025**, **Handsold**. Change quantity or other editable fields. Save. | Revenue/royalty stay consistent. |
| 3.3.P4 | Delete record | Open the sale for **Standalone One**, **December 2024**. Delete, confirm. | Record removed. |
| 3.3.N | Cancel delete | Open any sale → Delete → Cancel. | No change. |

### 3.4 Sales Record Input Tool (Req 3.4)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 3.4.P | Add distributor record | Sales → Add record (or input tool). Month/year Jan 2026, book **Archive Vol 1** (assisted), quantity 10, publisher revenue 95.00, source Distributor. | Author royalty auto (e.g. 50% of 95 = 47.50); not editable per spec. |
| 3.4.P2 | Add handsold record | Same tool. Month/year Feb 2026, book **Starship Dawn**, quantity 3, source Handsold. | Publisher revenue = (24.99 − 5) × 3 = 59.97; author royalty auto (e.g. 20%). |
| 3.4.P3 | Efficient repeat | Add one record; add another; keep same month/year or same book for next row. | Month/year or book carries over for fast entry. |
| 3.4.P4 | Review and commit | Add 2–3 records, review list, confirm. | All committed; appear in Sales Records. |
| 3.4.P5 | Book search by ISBN | In book selector type **9780599999999** or **0599999999** or **978-05-99999999**. | **Ingram Test Book** matches; dashes ignored. |
| 3.4.N | Invalid quantity/revenue | Enter negative quantity or negative publisher revenue. Try to submit. | Validation errors; no commit. |

### 3.5 Import from Ingram CSV (Req 3.5)

Use **Ingram Test Book** (ISBN-13 **9780599999999**). Valid file: `docs/sample_ingram_valid.csv`. Invalid returns file: `docs/sample_ingram_invalid_returns.csv`.

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 3.5.P | Valid file | Upload `docs/sample_ingram_valid.csv`; enter month/year (e.g. Jan 2026). | Validation passes; preview: source distributor, quantity 10, revenue 125.50, royalty computed; comment with Format, Market, filename, timestamp. |
| 3.5.P2 | Commit import | After preview, approve and commit. | Records created; comment like `Ingram: Format='Paperback' Market='United States' File='...' (YYYY-MM-DD HH:MM:SS)`. |
| 3.5.N | Wrong columns | Upload CSV with wrong headers or column count. | Validation errors; line numbers when possible. |
| 3.5.N2 | Returned Qty ≠ 0 | Upload `docs/sample_ingram_invalid_returns.csv`. | Error: Returned Qty must be zero. |
| 3.5.N3 | Net Qty ≠ Gross Qty | Use a CSV row with Net Qty ≠ Gross Qty. | Error: Net Qty must equal Gross Qty. |
| 3.5.N4 | ISBN not in system | Use CSV with ISBN that does not match any book (e.g. 9780000000000). | Error: book not found (with line). |
| 3.5.N5 | Invalid format | Format other than Paperback/Hardcover. | Validation error. |
| 3.5.N6 | BOM | Upload CSV with BOM (e.g. from Excel). | File accepted; BOM ignored. |

---

## 4. Author Management

### 4.1 Author List (Req 5.1)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 4.1.P | View table | Go to Authors. | Columns: name, email, number of books, total/paid/unpaid author royalty. |
| 4.1.P2 | Sort | Sort by name; then email; then book count. | Order updates; default sort by name. |
| 4.1.P3 | Keyword filter | Search “Test”. Then “orphan.author”. | **Test Author** and **Orphan Author**; then **Orphan Author**. |
| 4.1.P4 | Navigate to detail | Click **Test Author**. | Author detail for Test Author. |
| 4.1.P5 | Begin create | Click add author. | Navigate to author creation. |

### 4.2 Author Detail (Req 5.2)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 4.2.P | Summary and books | Authors → click **Test Author**. | Name, email; books table (Ingram Test Book, No-Sales Book, Starship Dawn, Starship Exodus) with total/paid/unpaid royalty per book. |
| 4.2.P2 | Generate report | From **Test Author** detail, click “Generate author royalty report” (or equivalent). | Report flow opens (req 6.1). |
| 4.2.P3 | No books | Authors → click **Orphan Author**. | No books listed; can delete (4.5.P). |

### 4.3 Author Creation (Req 5.3)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 4.3.P | Create author | Add author: name “New Author”, email “new.author@example.com”. Submit. | Author created; in list. |
| 4.3.N | Duplicate email | Add author with email **test.author@example.com**. Submit. | Error. |
| 4.3.N2 | Invalid email | Add author with email “not-an-email”. Submit. | Validation error. |

### 4.4 Author Modification (Req 5.4)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 4.4.P | Edit name and email | Authors → **Orphan Author** → Edit. Change name to “Orphan Author (Renamed)”, email to “orphan.renamed@example.com”. Save. | Author updated. |
| 4.4.N | Duplicate email | Edit **Orphan Author** email to **alice.johnson@example.com**. Save. | Error. |

### 4.5 Author Deletion (Req 5.5)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 4.5.P | Delete author with no books | Authors → click **Orphan Author** → Delete. Confirm (dialog shows name, no books). Confirm. | Author deleted. (Re-seed to restore.) |
| 4.5.P2 | Delete author with books | Authors → click **Test Author** → Delete. Confirm dialog shows name and book title(s), note about sales. Confirm. | Author and associated data removed (or retained per implementor); behavior clear. |
| 4.5.N | Cancel | **Bob Smith** → Delete → Cancel. | No change. |

---

## 5. Reports

### 5.1 Author Royalty Report (Req 6.1)

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 5.1.P | Default timespan | Reports → Author royalty report. | Default: four quarters ending current (e.g. 2025 Q2–2026 Q1). |
| 5.1.P2 | Select author and range | Select author **Test Author**, start 2025 Q1, end 2025 Q2. Generate. | PDF (or print-to-PDF); HP branding; author and date in header. |
| 5.1.P3 | Report structure | Generate for **Test Author**, range that includes 2025 Q1–Q2. | Quarters in range; all-time totals; per book (series/position/title; non-series last); per quarter×book: quantity sold, quantity handsold, author royalty unpaid/paid/total. |
| 5.1.P4 | Pagination | Generate for **Test Author** with default range. | No awkward splits across pages. |
| 5.1.N | No author selected | Leave author unselected. Click Generate. | Error (e.g. “Please select an author”). |

---

## 6. Consistency and Edge Cases

| ID   | Scenario | Steps | Expected |
|------|----------|--------|----------|
| 6.1.P | Book–sales consistency | Delete **Starship Exodus** (has 1 sale). Check Sales Records. | That sale is gone (or handled per implementor); no orphan. |
| 6.2.P | Author–book consistency | Delete **Test Author** (has books and sales). Check Books and Sales. | Books/sales handled consistently; no orphan books. |
| 6.3.P | Thumbnail vs full-size | Books list: **Starship Dawn** (no cover) vs a book with cover if any. Detail: open book with cover. | List shows thumbnail (downsized); detail shows large cover. |

---

## 7. Seed Data Summary (What the seed creates)

- **Authors (5)**: Test Author, Orphan Author, Alice Johnson, Bob Smith, Carol Williams.
- **Series (2)**: Starship Saga, Mystery Hollow.
- **Books (21)**: Ingram Test Book, No-Sales Book, Starship Dawn, Starship Exodus, Mystery at the Hollow, Standalone One, Archive Vol 1, Legacy Vol 1, Perspective Vol 1, Chronicle Vol 1, **Pagination Book 11** … **Pagination Book 21** (extra 11 for pagination testing).
- **Sales (15)**: Ingram Test Book (2), Starship Dawn (3), Starship Exodus (1), Mystery at the Hollow (2), Standalone One (1), Archive Vol 1 (1), Legacy Vol 1 (1), Perspective Vol 1 (1), Chronicle Vol 1 (1). No-Sales Book: 0.

Use the exact names above when the plan says “click **Book Name**” or “select author **Test Author**” or “the row for **Ingram Test Book**, **January 2025**, **Distributor**, **Paid**”.
