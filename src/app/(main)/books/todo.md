# Books Management Features - Implementation Plan

## Phase 0: Data + API Foundations

### 0.1 Data model and constraints
- [x] Define `Book` fields:
  - `id`
  - `title`
  - `authors`
  - `isbn13`
  - `isbn10`
  - `publicationMonth`
  - `publicationYear`
  - `defaultRoyaltyRate` (default 50%)
  - `createdAt`
  - `updatedAt`
- [ ] Enforce constraints (per definition 15):
  - ISBN-10 / ISBN-13 format and uniqueness (ignore dashes/spaces)
  - title required
  - at least one author required
  - valid publication month/year
  - royalty rate within valid range

### 0.2 Sales aggregates
- [ ] Compute per-book aggregates:
  - total sales to date
  - total publisher revenue
  - unpaid author royalty
  - paid author royalty
  - total author royalty
- [ ] Decide where aggregates are computed (server preferred)

### 0.3 API routes / service functions
- [ ] List books with:
  - sorting by any displayed field
  - keyword search over title, authors, isbn10, isbn13
  - total sales to date
- [ ] Book detail endpoint returns:
  - full book data
  - all sales records for the book
  - revenue and royalty totals
- [ ] Mutations:
  - create book
  - update book
  - delete book

---

## Phase 1: Book List View

### 1.1 Basic table
- [x] Create table with columns:
  - Title
  - Author(s)
  - ISBN-13
  - ISBN-10
  - Publication month/year
  - Author royalty rate
  - Total sales to date
- [x] Display mock or real data

### 1.2 Sorting
- [x] Implement column sorting
- [x] Support sorting for all displayed fields
- [x] Choose default sort order

### 1.3 Keyword search
- [ ] Add keyword search input
- [ ] Search covers:
  - title
  - author(s)
  - ISBN-10 / ISBN-13 (ignore dashes)
- [ ] Add clear/reset behavior

### 1.4 Navigation
- [x] Row click or action navigates to book detail view
- [ ] Add “New Book” button to start book creation

---

## Phase 2: Book Detail View

### 2.1 Read-only book detail
- [x] Display all book fields
- [x] Add Edit and Delete buttons

### 2.2 Sales records section
- [ ] Show all sales records for this book
- [ ] Use table layout consistent with Sales Listing
- [ ] Allow navigation to sales record detail

### 2.3 Totals section
- [x] Display totals:
  - publisher revenue
  - unpaid author royalty
  - paid author royalty
  - total author royalty
- [ ] Ensure totals update after changes

### 2.4 Create sales record from book detail
- [ ] Add “Create sales record” action
- [ ] Pre-fill book reference
- [ ] Support inline or navigated creation flow

---

## Phase 3: Book Creation

### 3.1 Manual creation
- [ ] Build form with fields:
  - title
  - author(s)
  - ISBN-13
  - ISBN-10
  - publication month/year
  - author royalty rate (default 50%)
- [ ] Enforce all validation rules
- [ ] Save creates book and navigates to detail view

### 3.2 Validation and UX
- [ ] Inline validation messages
- [ ] Success and error feedback

### 3.3 External database import (extra credit)
- [ ] Allow book creation via ISBN input
- [ ] Fetch metadata from external database
- [ ] Prefill form fields
- [ ] Allow edits before saving
- [ ] Abort without creating book if user cancels

---

## Phase 4: Book Modification

### 4.1 Edit flow
- [ ] Allow editing same fields as creation
- [ ] Save updates book and return to detail view

### 4.2 Royalty rate rule
- [ ] Changing royalty rate affects only future sales records
- [ ] Past sales records remain unchanged

---

## Phase 5: Book Deletion

### 5.1 Confirmation dialog
- [ ] Show highly visible confirmation modal
- [ ] Reiterate book title and author(s)
- [ ] Warn if sales records exist

### 5.2 Deletion behavior
- [ ] Decide and implement one behavior:
  - prevent delete if sales exist
  - cascade delete sales records
  - retain sales records with detached book reference
- [ ] Clearly communicate behavior in confirmation dialog

### 5.3 Post-delete behavior
- [ ] Redirect to book list
- [ ] Show success feedback

---

## Phase 6: Testing and Consistency

### 6.1 Consistency
- [ ] Reuse components and patterns from Sales pages
- [ ] Ensure tables, sorting, and navigation match Sales UX

### 6.2 Test cases
- [ ] Sorting on all columns
- [ ] Keyword search by title, author, ISBN
- [ ] Creation and edit validation failures
- [ ] Royalty rate changes not retroactive
- [ ] Delete behavior with and without sales records
- [ ] Correct totals for revenue and royalties
