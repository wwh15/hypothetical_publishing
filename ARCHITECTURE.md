# Table Architecture - Design Patterns

## Overview

This document describes the table architecture that provides a clean, maintainable design for displaying tabular data. The system uses view DTOs (like `SaleListItem`) for display, never Prisma payloads.

## Core Principles

1. **Stable Column IDs**: Column selection uses stable IDs (`SalesColumnId`), not field names or headers
2. **Pure Column Definitions**: Column definitions are context-independent (header + accessor + renderer)
3. **Explicit Allowlists**: Use `visibleColumns` (allowlist) or presets, not exclusions
4. **Page-Controlled Navigation**: Pages control navigation via `navigationContext` (serializable data) or `onRowClick` (client-side only)
5. **Type Safety**: Full TypeScript support with stable column ID types
6. **Next.js Compatible**: Only serializable data passed from server to client components

## Architecture Layers

### 1. Column Definitions (`lib/table-configs/sales-columns.tsx`)

**Purpose**: Pure column definitions with stable IDs

**Key Concepts**:
- `SalesColumnId`: Type-safe column identifiers (`'id' | 'title' | 'author' | ...`)
- `salesColumns`: Complete column definitions (pure, no context)
- `salesTablePresets`: Preset configurations that select columns via IDs

**Benefits**:
- Single source of truth for column definitions
- Reusable cell renderers (currency, status badges)
- Type-safe column selection
- Refactor-safe (change field names without breaking column IDs)

**Example**:
```typescript
// Preset selects columns by stable IDs
preset="bookDetail"  // Uses: ['id', 'quantity', 'publisherRevenue', ...]

// Or explicit allowlist
visibleColumns={['date', 'quantity', 'publisherRevenue']}
```

### 2. Navigation (`lib/table-configs/navigation.ts`)

**Purpose**: Simple helpers for common navigation patterns

**Key Concept**: Pages control navigation by passing serializable data, not functions

**Benefits**:
- Next.js compatible: Only serializable data (strings/numbers) passed from server to client
- Flexible: Pages can use `navigationContext` (for query params) or `onRowClick` (client-side only)
- Supports different behaviors: new tabs, selection mode, no navigation, etc.
- Easy to customize per page

**Example**:
```typescript
// Server component passes serializable data
<SalesRecordsTable 
  rows={sales}
  navigationContext={{ from: 'book', bookId: bookId }}
/>

// Client component can use onRowClick for custom behavior
<SalesRecordsTable 
  rows={sales}
  onRowClick={(row) => window.open(`/sales/records/${row.id}`, '_blank')}
/>
```

### 3. Table Presets

**Purpose**: Choose which columns show and how row navigation works

**Presets Available**:
- `full`: All columns (default)
- `bookDetail`: Essential columns for book detail view
- `minimal`: Minimal essential columns

**Benefits**:
- Consistent UX across similar contexts
- Easy to add new presets
- Type-safe column selection

### 4. Table Components

**Purpose**: Presentational components that compose configurations

**API**:
```typescript
<SalesRecordsTable 
  rows={sales}                    // View DTOs, not Prisma payloads
  preset="bookDetail"             // Use preset
  // OR
  visibleColumns={['date', ...]}  // Explicit allowlist
  navigationContext={{ from: 'book', bookId: 123 }}  // Query params (serializable)
  // OR (client-side only)
  onRowClick={(row) => {...}}     // Custom click handler
/>
```

## Usage Patterns

### Pattern 1: Preset Configuration (Recommended)
```typescript
// Use preset for common use case
<SalesRecordsTable rows={sales} preset="bookDetail" />
```

### Pattern 2: Explicit Column Allowlist
```typescript
// Explicitly specify which columns to show
<SalesRecordsTable 
  rows={sales} 
  visibleColumns={['date', 'quantity', 'publisherRevenue', 'authorRoyalty', 'paid']}
/>
```

### Pattern 3: Custom Navigation with navigationContext
```typescript
// Server component: Pass serializable data for query params
<SalesRecordsTable 
  rows={sales}
  navigationContext={{ from: 'book', bookId: bookId }}
/>
// Results in: /sales/records/:id?from=book&bookId=123
```

### Pattern 4: Custom Navigation with onRowClick (Client-Side Only)
```typescript
// Custom click handler (e.g., open in new tab, selection mode)
<SalesRecordsTable 
  rows={sales}
  onRowClick={(row) => window.open(`/sales/records/${row.id}`, '_blank')}
/>
```

## Benefits of This Architecture

### 1. Maintainability
- **Single Source of Truth**: Column definitions in one place
- **Stable IDs**: Change field names without breaking column selection
- **Clear Structure**: Easy to find and modify code

### 2. Type Safety
- **Stable Column IDs**: Type-safe column selection (`SalesColumnId`)
- **Compile-time Checks**: Catch errors before runtime
- **Refactor-safe**: Rename fields without breaking column configs

### 3. Flexibility
- **Page-Controlled Navigation**: Pages decide navigation behavior via serializable data
- **Next.js Compatible**: No function passing from server to client components
- **Explicit Allowlists**: Clear which columns are shown
- **No Hidden Behavior**: All configuration is explicit

### 4. Consistency
- **Uniform UX**: Same table behavior across pages
- **Consistent Styling**: Shared renderers ensure consistent appearance
- **Predictable**: Developers know what to expect

### 5. Separation of Concerns
- **View DTOs**: Tables use `SaleListItem`, never Prisma payloads
- **Pure Columns**: Column definitions have no context-specific behavior
- **Page Control**: Navigation logic lives in pages, not table components

## Data Contract

**Important**: `DataTable` and table components consume **view DTOs** (like `SaleListItem`), never Prisma payloads.

- **View DTOs**: Flattened, UI-optimized types for display (`SaleListItem`, `BookListItem`)
- **Prisma Payloads**: Used for edit/detail forms, not table display

This separation ensures:
- Tables are fast (no nested object access)
- Consistent data shape across contexts
- Easy to mock and test

## Migration Guide

### Before (Old Pattern)
```typescript
// Column definitions embedded in component
const columns = [
  { key: 'id', header: 'ID', ... },
  // ... duplicated across components
];

// Exclude columns
<SalesRecordsTable salesData={sales} excludeColumns={['title']} />
```

### After (New Pattern)
```typescript
// Use preset or explicit allowlist
<SalesRecordsTable rows={sales} preset="bookDetail" />
// OR
<SalesRecordsTable rows={sales} visibleColumns={['date', 'quantity', ...]} />
```

## Best Practices

1. **Use Presets When Possible**: Prefer `preset="bookDetail"` over manual `visibleColumns`
2. **Explicit Allowlists**: If you need custom columns, use `visibleColumns` (not exclusions)
3. **Page Controls Navigation**: 
   - Server components: Use `navigationContext` (serializable data) for query params
   - Client components: Can use `onRowClick` for custom behavior
   - Never pass functions from server to client components
4. **Use View DTOs**: Always pass view DTOs (`SaleListItem`) to tables, never Prisma payloads
5. **Stable Column IDs**: Reference columns by their stable IDs, not field names

## File Structure

```
src/
├── lib/
│   └── table-configs/
│       ├── sales-columns.tsx     # Sales column definitions (contains JSX)
│       ├── navigation.ts         # Navigation utilities
│       └── (future: books-columns.tsx, etc.)
├── app/
│   └── sales/
│       └── components/
│           └── SalesRecordsTable.tsx  # Composes configs
└── components/
    └── DataTable.tsx              # Generic table component
```

## Summary

This architecture provides:
- ✅ **Stable column IDs** for type-safe, refactor-safe column selection
- ✅ **Pure column definitions** with no context-specific behavior
- ✅ **Explicit allowlists** (`visibleColumns`) instead of exclusions
- ✅ **Next.js compatible navigation**: `navigationContext` (serializable) or `onRowClick` (client-only)
- ✅ **Clear data contract**: tables use view DTOs, never Prisma payloads
- ✅ **Simple API**: `rows`, `preset`, `visibleColumns`, `navigationContext`

The result is a maintainable, type-safe table system that's easy to understand and extend.
