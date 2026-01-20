"use client";

import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { SaleListItem } from "@/lib/data/records";

export default function SalesRecordsTable({ salesData }: { salesData: SaleListItem[] }) {
    const router = useRouter();

    const handleRowClick = (sale: SaleListItem) => {
        router.push(`/sales/records/${sale.id}`);
    };

    const columns: ColumnDef<SaleListItem>[] = [
        {
            key: 'id',
            header: 'ID',
            accessor: 'id',
            className: 'w-[80px]',
            sortable: true, // Enable sorting
        },
        {
            key: 'title',
            header: 'Title',
            accessor: 'title',
            sortable: true,
        },
        {
            key: 'author',
            header: 'Author',
            accessor: 'author',
            sortable: true,
        },
        {
            key: 'quantity',
            header: 'Quantity',
            accessor: 'quantity',
            sortable: true,
            render: (row) => (
                <span>{row.quantity}</span>
            ),
        },
        {
            key: 'publisherRevenue',
            header: 'Publisher Revenue',
            accessor: 'publisherRevenue',
            sortable: true,
            render: (row) => (
                <span className="font-medium">${row.publisherRevenue.toFixed(2)}</span>
            ),
        },
        {
            key: 'authorRoyalty',
            header: 'Author Royalty',
            accessor: 'authorRoyalty',
            sortable: true,
            render: (row) => (
                <span className="font-medium">${row.authorRoyalty.toFixed(2)}</span>
            ),
        },
        {
            key: 'date',
            header: 'Date',
            accessor: 'date',
            sortable: true,
        },
        {
            key: 'paid',
            header: 'Royalty Status',
            sortable: false, // Don't need to sort by status badge
            render: (row) => {
                const paidStyles = {
                    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                } as const;
                return (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paidStyles[row.paid]}`}
                    >
                        {row.paid.charAt(0).toUpperCase() + row.paid.slice(1)}
                    </span>
                );
            },
        },
    ];

    return (
        <DataTable<SaleListItem> 
            columns={columns} 
            data={salesData} 
            emptyMessage="No sales found" 
            onRowClick={handleRowClick}
            defaultSortField="date"        
            defaultSortDirection="desc"    
            showDateFilter={true}        
            dateFilterField="date"
        />
    );
}