// src/app/(main)/sales/records/[record_id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSaleById } from "../../action";  // after you add it
import EditForm from "./EditForm";

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

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/sales/records" className="text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Sales Records
        </Link>
        <h1 className="text-3xl font-bold">Sales Record #{id}</h1>
      </div>
      <EditForm sale={sale} />
    </div>
  );
}