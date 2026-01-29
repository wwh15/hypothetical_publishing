import { getAuthorPaymentData } from '../action';
import AuthorPaymentsTable from '../components/AuthorPaymentsTable';
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default async function AuthorPaymentsPage() {
    
    // getAuthorPaymentData is a function, call it to get the sales data
    const authorPaymentData = await getAuthorPaymentData();

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Link 
                    href="/sales" 
                    className="text-blue-600 hover:underline mb-2 inline-block"
                >
                    ← Back to Sales
                </Link>
                <h1 className="text-3xl font-bold">Author Payments</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all author payments
                </p>
            </div>
            <AuthorPaymentsTable authorPaymentData={authorPaymentData} />
        </div>
    );
}