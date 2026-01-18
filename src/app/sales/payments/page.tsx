import { getAuthorPaymentData, getSalesRecordData } from '../action';
import AuthorPaymentsTable from '../components/AuthorPaymentsTable';
export default function AuthorPaymentsPage() {
    
    // getAuthorPaymentData is a function, call it to get the sales data
    const authorPaymentData = getAuthorPaymentData();

    return (
        <div className="container mx-auto py-10">
    
            <div className="mt-6 mb-6">
                <h1 className="text-3xl font-bold">Author Payments</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all author payments
                </p>
            </div>
            <AuthorPaymentsTable authorPaymentData={authorPaymentData} />
        </div>
    );
}