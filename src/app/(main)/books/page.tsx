import { getBooksData } from './action';
import BooksTable from "./components/BooksTable";
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default async function BooksPage() {
    const booksData = await getBooksData();

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Books</h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all books
                </p>
            </div>
            <BooksTable booksData={booksData} />
        </div>
    );
}
