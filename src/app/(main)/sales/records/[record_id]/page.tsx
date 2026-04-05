// src/app/(main)/sales/records/[record_id]/page.tsx
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getSaleById, getUsdConversionRates } from "../../action";
import { getAllBooks } from "@/app/(main)/books/action";
import SalesRecordDetailClient from "./SalesRecordDetailClient";

export const dynamic = "force-dynamic";

export default async function SalesRecordDetailPage({
  params,
}: {
  params: Promise<{ record_id: string }> | { record_id: string };
}) {
  const { record_id } =
    typeof params === "object" && params !== null && "then" in params
      ? await params
      : params;
  const id = parseInt(record_id, 10);
  if (Number.isNaN(id)) notFound();

  const sale = await getSaleById(id);
  if (!sale) notFound();

  const [books, usdRates] = await Promise.all([
    getAllBooks(),
    getUsdConversionRates().catch((): Record<string, number> | null => null),
  ]);

  return (
    <div className="py-10">
      <div className="mb-6">
        <BackLink href="/sales/records">Back to Sales</BackLink>
        <h1 className="text-3xl font-bold mt-4 mb-2">Sale record</h1>
      </div>
      <SalesRecordDetailClient
        sale={sale}
        books={books}
        usdRatesInitial={usdRates}
      />
    </div>
  );
}
