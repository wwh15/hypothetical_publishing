import { asyncGetSaleById } from '@/lib/data/records';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EditForm from './EditForm';

interface PageProps {
  params: Promise<{ record_id: string }>;
}

export default async function SalesRecordDetailPage({ params }: PageProps) {
  const { record_id } = await params;
  const saleId = parseInt(record_id);

  const sale = await asyncGetSaleById(saleId);

  if (!sale) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link 
          href="/sales/records" 
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Sales Records
        </Link>
        <h1 className="text-3xl font-bold">Sales Record #{sale.id}</h1>
      </div>

      <EditForm sale={sale} />
    </div>
  );
}