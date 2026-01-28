import { getSalesRecordData } from '../action';
import SalesRecordsTable from '@/app/(main)/sales/components/SalesRecordsTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = "force-dynamic";

export default async function SalesRecordsPage() {
    
    // getSalesRecordData is a function, call it to get the sales data
    const salesData = await getSalesRecordData();

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6 space-y-6">
                <div className="flex flex-col gap-3">
                    <Link href="/sales" className="w-fit">
                        <Button variant="outline" size="sm">
                            ← Back to Sales
                        </Button>
                    </Link>
                    <Link href="/sales/add-record" className="w-fit">
                        <Button size="sm">Add New Sale Record</Button>
                    </Link>
                </div>

                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Records</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all sales transactions
                    </p>
                </div>
            </div>
            <SalesRecordsTable rows={salesData} />
        </div>
    );
}