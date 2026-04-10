"use client";

import { useState } from "react";
import type { SaleDetailPayload } from "@/lib/data/records";
import type { BookListItem } from "@/lib/data/books";
import SalesRecordView from "./SalesRecordView";
import SalesRecordEditForm from "./SalesRecordEditForm";

interface SalesRecordDetailClientProps {
  sale: SaleDetailPayload;
  books: BookListItem[];
  usdRatesInitial?: Record<string, number> | null;
}

export default function SalesRecordDetailClient({
  sale,
  books,
  usdRatesInitial,
}: SalesRecordDetailClientProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <SalesRecordEditForm
        sale={sale}
        books={books}
        usdRatesInitial={usdRatesInitial}
        onClose={() => setEditing(false)}
      />
    );
  }

  return <SalesRecordView sale={sale} onEdit={() => setEditing(true)} />;
}
