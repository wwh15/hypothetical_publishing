import SalesListView from './components/SalesListView';
import { getAuthorPaymentData, getSalesRecordData } from './action';
import AuthorPaymentsView from './components/AuthorPaymentsView';

export default function SalesPage() {
    // getSalesRecordData is a function, call it to get the sales data
    const salesData = getSalesRecordData();
    const authorPaymentData = getAuthorPaymentData();

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Sales</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all sales transactions
                </p>
            </div>
            <SalesListView salesData={salesData} />

            <div className="mt-6 mb-6">
                <h1 className="text-3xl font-bold">Author Payments</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all author payments
                </p>
            </div>
            <AuthorPaymentsView authorPaymentData={authorPaymentData} />
        </div>
    );
}