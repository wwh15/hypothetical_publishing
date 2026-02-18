"use client";

import { useRouter } from "next/navigation";
import { BaseDataTable } from "@/components/BaseDataTable";
import { AuthorBookItem } from "@/lib/data/author";
import { getAuthorBooksPresetColumns } from "@/lib/table-configs/author-columns";

interface Props {
  data: AuthorBookItem[];
  authorName: string;
}

export function AuthorBooksTable({ data, authorName }: Props) {
  const router = useRouter();

  const handleRowClick = (row: AuthorBookItem) => {
    router.push(`/books/${row.id}`);
  };

  const columns = getAuthorBooksPresetColumns();


  return (
    <BaseDataTable
      columns={columns}
      data={data}
      emptyMessage={`No books found for ${authorName}`}
      onRowClick={handleRowClick}
    />
  );
}