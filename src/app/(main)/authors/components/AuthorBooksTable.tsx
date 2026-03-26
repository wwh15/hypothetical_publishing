"use client";

import { BaseDataTable } from "@/components/BaseDataTable";
import { AuthorBookItem } from "@/lib/data/author";
import { authorBookColumns } from "@/lib/table-configs/author-columns";
import { useRouter } from "next/navigation";

export interface AuthorBooksTableProps {
  rows: AuthorBookItem[];
  onRowClick?: (row: AuthorBookItem) => void;
}

export default function AuthorBooksTable({
  rows,
  onRowClick,
}: AuthorBooksTableProps) {
  const router = useRouter();

  const handleRowClick =
    onRowClick ||
    ((authorBookItem: AuthorBookItem) => {
      router.push(`/books/${authorBookItem.id}`);
    });

  return (
    <BaseDataTable<AuthorBookItem>
      data={rows}
      columns={authorBookColumns}
      onRowClick={handleRowClick}
      emptyMessage={"No books records"}
    />
  );
}
