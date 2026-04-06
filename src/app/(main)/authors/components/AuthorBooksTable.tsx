"use client";

import { BaseDataTable } from "@/components/BaseDataTable";
import { AuthorBookItem } from "@/lib/data/author";
import { authorBookColumns } from "@/lib/table-configs/author-columns";

export interface AuthorBooksTableProps {
  rows: AuthorBookItem[];
  onRowClick?: (row: AuthorBookItem) => void;
}

export default function AuthorBooksTable({
  rows,
  onRowClick,
}: AuthorBooksTableProps) {
  return (
    <BaseDataTable<AuthorBookItem>
      data={rows}
      columns={authorBookColumns}
      getRowHref={onRowClick ? undefined : (row) => `/books/${row.id}`}
      getRowLinkLabel={(row) => `Book: ${row.title}`}
      onRowClick={onRowClick}
      emptyMessage={"No books records"}
    />
  );
}
