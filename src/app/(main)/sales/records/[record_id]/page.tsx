// src/app/(main)/sales/records/[record_id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { getSaleById } from "../../action";
import EditForm from "./EditForm";
import { getAllBooks } from "@/app/(main)/books/action";

export default async function SalesRecordDetailPage({
  params,
}: {
  params: Promise<{ record_id: string }> | { record_id: string };
}) {
  const { record_id } = typeof params === "object" && "then" in params ? await params : params;
  const id = parseInt(record_id, 10);
  if (Number.isNaN(id)) notFound();

  const sale = await getSaleById(id);
  if (!sale) notFound();

  // Load all books so the book selector can find any book (not just page 1)
  const books = await getAllBooks();

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <BackLink href="/sales/records" className="mb-2">
          Back to Sales Records
        </BackLink>
        <h1 className="text-3xl font-bold">Sales Record #{id}</h1>
      </div>
      <EditForm sale={sale} books={books}/>
    </div>
  );
}