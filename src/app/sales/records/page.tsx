import { getAuthorPaymentData, getSalesRecordData } from '../action';
import SalesRecordsTable from '../components/SalesRecordsTable';
export default function SalesRecordsPage() {
    
    // getSalesRecordData is a function, call it to get the sales data
    const salesData = getSalesRecordData();

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Sales</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all sales transactions
                </p>
            </div>
            <SalesRecordsTable salesData={salesData} />
        </div>
    );
}