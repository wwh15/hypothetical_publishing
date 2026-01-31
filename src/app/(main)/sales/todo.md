# Sales module – requirements (todo)

## 3.1 Sales record listing

A tabular view of sales records with:

- **Columns**: book title, book author, month/year of record, quantity sold, publisher revenue, author royalty, and a visual indicator (differing in both **color** and **shape**) for whether the author royalty has been paid.
- **Sorting**: sortable by any displayed field; **default sort** descending by record month/year (newest first).
- **Filtering**: filter by date range.
- **Navigation**:
  - To sales record detail/modify view (req 3.3).
  - To book detail view (req 2.2).
  - To sales input tool (req 3.4).

**Todo**

- [x] Columns: title, author, month/year, quantity, publisher revenue, author royalty, paid indicator (color + shape).
- [x] Sortable by every column; default sort = month/year descending (newest first).
    - [x] id
    - [x] title
    - [x] author
    - [x] quantity
    - [x] publisher revenue
    - [x] author royalty
    - [x] date
    - [x] royalty status
- [x] Date-range filter.
- [x] Row → sales record detail (3.3).
- [x] Row → book detail (2.2).
- [x] Page-level link/CTA to sales input tool (3.4).

---

## 3.2 Author payments view

A tabular view of sales records, similar to 3.1, but:

- **Grouped and sorted** by author(s), then within each author by record month/year descending (newest first).
- **Per-author subtotal** of unpaid author royalty.
- **Per-author action**: next to the unpaid total, a UI control that, after a **confirmation dialog**, marks all unpaid sales records for that author as paid (for issuing payments and updating the system).
- **Navigation**: same as 3.1 — to record detail (3.3), book detail (2.2), and sales input tool (3.4).

**Todo**

- [x] Table grouped by author(s), then sorted by month/year descending.
- [x] Per-author unpaid royalty subtotal.
- [x] Per-author “Mark all as paid” (or equivalent) with confirmation dialog.
- [x] Navigate to sales record detail (3.3).
- [x] Navigate to book detail (2.2).
- [x] Navigate to sales input tool (3.4).

---

## 3.3 Sales record detail/modify view

- **View** all fields of the sales record.
- **Edit**: month/year, book reference, quantity sold, publisher revenue, author royalty (override of rate-based calculation), author-paid status.
- **Delete**: option to delete the record, with a **confirmation dialog**.

**Todo**

- [ ] Detail view shows all record fields.
- [ ] Edit
    - [ ] add validation
    - [x] month/year
    - [ ] book reference
    - [x] quantity
    - [x] publisher revenue
    - [ ] author royalty (with override)
    - [ ] auto-populate author royalty from new publisher revenue
    - [ ] author-paid.
- [ ] Delete record with confirmation dialog.

---

## 3.4 Sales record input tool

Optimized for **rapid, bulk input** (e.g. from distributor PDF/CSV/web).

- **Input per record**: month/year, book, quantity sold, publisher revenue.
- **Book selection**: assisted search — keyword by title, **especially by ISBN-13/ISBN-10** (dashes ignored); fast autocomplete, minimal clicks/keystrokes.
- **Author royalty**: auto-filled as (book royalty rate) × (publisher revenue). If user overrides, show it **distinctly**; if user clears override, **revert** to computed value.
- **Author-paid**: default `false`.
- **Efficiency**:
  - After submitting one record, **carry forward** month/year and/or book to the next input (no extra “add another” click).
  - New input fields appear without clicking “add another.”
  - **Keyboard**: Tab between fields, standard shortcuts.
  - **Validation** per def 16.
- **Commit**: user can **review** all input records, then a single **confirmation** to commit all to the system at once.

**Todo**

- [x] Month/year + book + quantity + publisher revenue inputs.
- [ ] Book: search by title and ISBN-13/10 (normalize dashes); fast autocomplete.
    - [ ] normalize dashes
- [ ] Author royalty auto-calc; override shown distinctly; revert on clear.
- [x] Author-paid default false.
- [x] Month/year and book “drop down” to next record after add.
- [x] No “add another” click — next row/fields appear automatically.
- [x] Tab and standard keyboard shortcuts.
- [ ] Validation per def 16.
- [ ] Review step + single confirmation to commit all.
    - [x] confirmation dialog
    - [x] title
    - [x] date
    - [x] quantity
    - [x] publisher revenue
    - [x] author royalty
    - [x] delete action
    - [ ] edit action
    - [ ] paid status (default to unpaid)

**Extra**
- [ ] edit rows in-line
