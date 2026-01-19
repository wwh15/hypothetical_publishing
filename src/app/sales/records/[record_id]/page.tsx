import { asyncGetSaleById } from '@/lib/data/records';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EditForm from './EditForm';

interface PageProps {
  params: Promise<{ record_id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function SalesRecordDetailPage({ params, searchParams }: PageProps) {
  const { record_id } = await params;
  const { from } = await searchParams;
  const saleId = parseInt(record_id);

  const sale = await asyncGetSaleById(saleId);

  if (!sale) {
    notFound();
  }

  // Determine back link based on where user came from
  const backLink = from === 'payments' ? '/sales/payments' : '/sales/records';
  const backLabel = from === 'payments' ? 'Back to Author Payments' : 'Back to Sales Records';

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link 
          href={backLink}
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← {backLabel}
        </Link>
        <h1 className="text-3xl font-bold">Sales Record #{sale.id}</h1>
      </div>

      <EditForm sale={sale} />
    </div>
  );
}