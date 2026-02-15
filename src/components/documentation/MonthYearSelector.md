# Sales Form & Date Integrity Documentation

This system uses a multi-layered approach to handle sale dates, ensuring that invalid data never reaches the database and the UI remains consistent.

---

## 🛑 Potential Issues & Risks

1.  **Empty Dates**: User attempts to save without selecting a month/year.
2.  **Corrupted Input**: External data or bugs passing non-date strings (e.g., `"NaN-NaN"` or `"hello"`).
3.  **Impossible Years (Year 0000)**: Manual database edits resulting in Year 0, which JavaScript renders as `-1`, causing UI glitches like `-1-12`.
4.  **JS Date Rollover**: JavaScript's `new Date()` automatically "fixes" invalid months (e.g., Month 13 becomes January of next year), leading to silent data entry errors.

---

## 🛡️ Implemented Solutions

### 1. The Inbound Firewall (`EditForm.tsx`)
Before the form state is initialized, data is scrubbed against business "Sanity Ranges."
* **Sanity Constants**: `SALES_YEAR_MIN (1000)` and `SALES_YEAR_MAX (Current Year)` define the valid window for sales.
* **Range Validation**: `initialDateYear` and `initialDateMonth` check the year. If it falls outside the range (e.g., year `0000`), they return `""` (empty string).
* **Developer Logging**: If an out-of-range year is detected, `initialDateYear` triggers a `console.error` to alert developers of database corruption.

### 2. The Interaction Layer (`MonthYearSelector.tsx`)
The UI prevents errors before they happen and adapts its size to the content.
* **Dynamic UI Scaling**: The trigger button uses `w-fit` and `min-w-[125px]` to ensure the box length matches the length of the `placeholder` or the selected `value` dynamically.
* **Boundary Enforcement**: `isDisabledCandidate` compares `YYYY-MM` strings against bounds using lexicographic comparison to disable selection.
* **Visual Fallback**: `handleOpenChange` uses the nullish coalescing operator (`selectedYear ?? new Date().getFullYear()`) so the calendar opens at a valid year even if input is null or scrubbed.



### 3. The Form Gatekeeper (`EditForm.tsx`)
The `handleSave` function performs a final manual validation before the Server Action:
1.  **Presence Check**: `if (!formData.dateYear || !formData.dateMonth)` blocks empty submissions.
2.  **Numeric Check**: Uses `parseInt(..., 10)` and `isNaN()` to verify numeric state.
3.  **Sanity Check**: Wraps inputs in `new Date(year, month - 1, 1)` and verifies with `isNaN(date.getTime())` to catch invalid objects.



### 4. The Error Feedback Loop
* **Local UI**: `setDateError("...")` provides immediate red-text feedback to the user.
* **Server Feedback**: The `result.success` check captures server-side rejections and displays them via the same `dateError` state.

---

## 📋 Logic Summary Table

| Step | Responsible Logic | Success Outcome | Failure Outcome |
| :--- | :--- | :--- | :--- |
| **Inbound Scrub** | `initialDateYear` | Valid `YYYY` string | Returns `""` + `console.error` |
| **UI Sizing** | `cn("w-fit", ...)` | Box matches text length | `min-w` prevents collapse |
| **Grid Parsing** | `parseYear` / `parseMonth` | Returns numbers for UI | Returns `null` (UI stays clean) |
| **Constraint** | `isDisabledCandidate` | Month is clickable | `pointer-events-none` applied |
| **Submission** | `handleSave` block | Proceeds to `updateSale` | Sets `dateError` & stops |
| **JS Translation** | `month - 1` | Correct 0-indexed Date | `isNaN(date.getTime())` |