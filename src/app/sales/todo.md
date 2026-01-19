# Sales Management Features - Implementation Plan

## Phase 1: Basic Table Views (Skeleton)

### 1.1 Sales Record Listing - Basic Table
- [x] Create basic table component with columns:
  - Book Title
  - Author
  - Month/Year of Record
  - Quantity Sold
  - Publisher Revenue
  - Author Royalty
  - Royalty Status
- [x] Add visual indicator for Royalty Status (color + shape)
- [x] Display mock/real data in table

### 1.2 Author Payments View - Basic Table
- [x] Create basic table grouped by author
- [x] Display same columns as sales listing
- [x] Show subtotal of unpaid royalties per author

### 1.3 Sales Record Detail View - Basic Display
- [x] Create detail page showing all record fields
- [x] Display read-only data

---

## Phase 2: Interactive Features

### 2.1 Sales Listing - Sorting & Filtering
- [x] Implement column sorting (click headers to sort)
- [x] Set default sort: descending by month/year (newest first)
- [x] Add date range filter UI
- [x] Implement date range filtering logic

### 2.2 Author Payments View - Sorting
- [x] Group records by author
- [x] Sort by author name
- [x] Within each author group, sort by month/year (newest first)

---

## Phase 3: Navigation & Basic Actions

### 3.1 Sales Listing - Navigation
- [x] Add link/button to navigate to sales record detail
- [ ] Add link/button to navigate to book detail view
- [ ] Add link/button to open sales input tool

### 3.2 Author Payments View - Navigation
- [ ] Add link/button to navigate to sales record detail
- [ ] Add link/button to navigate to book detail view
- [ ] Add link/button to open sales input tool

### 3.3 Sales Record Detail - Edit Mode
- [x] Enable editing of month/year
- [x] Enable editing of book reference
- [x] Enable editing of quantity sold
- [x] Enable editing of publisher revenue
- [x] Enable editing/overriding of author royalty
- [x] Enable toggling of author-Royalty Status
- [x] Add save functionality

### 3.4 Sales Record Detail - Delete
- [x] Add delete button
- [x] Implement confirmation dialog
- [x] Handle record deletion

---

## Phase 4: Advanced Payment Features

### 4.1 Author Payments - Bulk Payment Action
- [ ] Add "Mark as Paid" button next to each author's unpaid total
- [ ] Implement confirmation dialog for bulk payment
- [ ] Update all unpaid records for selected author to "paid"
- [ ] Refresh subtotals after update

---

## Phase 5: Sales Input Tool (Batch Entry)

### 5.1 Basic Input Form
- [ ] Create form for single sales record entry
- [ ] Add fields: month/year, book, quantity, publisher revenue
- [ ] Add author royalty field (calculated)

### 5.2 Book Search & Autocomplete
- [ ] Implement book search by title
- [ ] Implement ISBN-10 and ISBN-13 search (ignore dashes)
- [ ] Add autocomplete dropdown
- [ ] Optimize for minimal clicks/keystrokes

### 5.3 Auto-Calculation & Override
- [ ] Auto-calculate author royalty: `book.royaltyRate × publisherRevenue`
- [ ] Allow manual override of author royalty
- [ ] Add visual indicator when value is overridden
- [ ] Reset to calculated value when cleared
- [ ] Default author-paid to `false`

### 5.4 Batch Entry Efficiency
- [ ] Add dynamic field generation (no "add another" button needed)
- [ ] Implement "drop-down" behavior for month/year
- [ ] Implement "drop-down" behavior for book selection
- [ ] Ensure Tab key navigation works seamlessly
- [ ] Validate all inputs per validation rules

### 5.5 Batch Review & Commit
- [ ] Create review screen showing all entered records
- [ ] Add confirmation button to commit all records at once
- [ ] Handle batch save to database
- [ ] Show success/error feedback

---

## Notes
- Start with static tables to establish UI/UX foundation
- Add interactivity incrementally to validate each feature
- Prioritize keyboard navigation and efficiency throughout
- Test with realistic data volumes at each phase