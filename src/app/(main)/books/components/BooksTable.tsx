"use client";

import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { BookListItem } from "@/lib/data/books";

export default function BooksTable({ booksData }: { booksData: BookListItem[] }) {
    const router = useRouter();

    const handleRowClick = (book: BookListItem) => {
        router.push(`/books/${book.id}`);
    };

    const columns: ColumnDef<BookListItem>[] = [
        {
            key: 'title',
            header: 'Title',
            accessor: 'title',
            sortable: true,
        },
        {
            key: 'authors',
            header: 'Author(s)',
            accessor: 'authors',
            sortable: true,
        },
        {
            key: 'isbn13',
            header: 'ISBN-13',
            accessor: 'isbn13',
            sortable: true,
            render: (row) => (
                <span>{row.isbn13 || '-'}</span>
            ),
        },
        {
            key: 'isbn10',
            header: 'ISBN-10',
            accessor: 'isbn10',
            sortable: true,
            render: (row) => (
                <span>{row.isbn10 || '-'}</span>
            ),
        },
        {
            key: 'publication',
            header: 'Publication',
            sortable: false,
            render: (row) => {
                if (row.publicationMonth && row.publicationYear) {
                    const monthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                    ];
                    const monthIndex = parseInt(row.publicationMonth) - 1;
                    const monthName = monthIndex >= 0 && monthIndex < 12 
                        ? monthNames[monthIndex] 
                        : row.publicationMonth;
                    return <span>{monthName} {row.publicationYear}</span>;
                }
                return <span>-</span>;
            },
        },
        {
            key: 'defaultRoyaltyRate',
            header: 'Royalty Rate',
            accessor: 'defaultRoyaltyRate',
            sortable: true,
            render: (row) => (
                <span className="font-medium">{row.defaultRoyaltyRate}%</span>
            ),
        },
        {
            key: 'totalSales',
            header: 'Total Sales',
            accessor: 'totalSales',
            sortable: true,
            render: (row) => (
                <span className="font-medium">{row.totalSales.toLocaleString()}</span>
            ),
        },
    ];

    return (
        <DataTable<BookListItem> 
            columns={columns} 
            data={booksData} 
            emptyMessage="No books found" 
            onRowClick={handleRowClick}
            defaultSortField="title"        
            defaultSortDirection="asc"    
        />
    );
}
