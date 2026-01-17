"use client";

import { DataTable, ColumnDef } from "./DataTable";
import { Sale } from "@/lib/data/sales";

export default function SalesListView({ salesData }: { salesData: Sale[] }) {

    // Define columns with type safety
    const columns: ColumnDef<Sale>[] = [
        {
            key: 'id',
            header: 'ID',
            accessor: 'id',
            className: 'w-[80px]',
        },
        {
            key: 'title',
            header: 'Title',
            accessor: 'title',
        },
        {
            key: 'author',
            header: 'Author',
            accessor: 'author',
        },
        {
            key: 'quantity',
            header: 'Quantity',
            accessor: 'quantity',
            className: 'text-right',
            render: (row) => (
                <span>{row.quantity}</span>
            ),
        },
        {
            key: 'publisherRevenue',
            header: 'Publisher Revenue',
            accessor: 'publisherRevenue',
            className: 'text-right',
            render: (row) => (
                <span className="font-medium">${row.publisherRevenue.toFixed(2)}</span>
            ),
        },
        {
            key: 'authorRoyalty',
            header: 'Author Royalty',
            accessor: 'authorRoyalty',
            className: 'text-right',
            render: (row) => (
                <span className="font-medium">${row.authorRoyalty.toFixed(2)}</span>
            ),
        },
        {
            key: 'date',
            header: 'Date',
            accessor: 'date', // Format: MM-YYYY
        },
        {
            key: 'paid',
            header: 'Paid Status',
            render: (row) => {
                const paidStyles = {
                    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                } as const;
                return (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paidStyles[row.paid]
                            }`}
                    >
                        {row.paid.charAt(0).toUpperCase() + row.paid.slice(1)}
                    </span>
                );
            },
        },
    ];

    return (
        <DataTable<Sale> columns={columns} data={salesData} emptyMessage="No sales found" />
    )


}