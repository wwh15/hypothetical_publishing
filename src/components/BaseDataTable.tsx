import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
    key: string;
    header: string | React.ReactNode;
    render: (row: T) => React.ReactNode; 
    className?: string;
}

interface BaseDataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    className?: string;
}

export function BaseDataTable<T>({
    columns,
    data,
    emptyMessage = 'No records found.',
    onRowClick,
    className,
}: BaseDataTableProps<T>) {
    return (
        <div className={cn("rounded-md border", className)}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <th 
                                key={column.key} 
                                className={cn("px-4 py-3 text-left font-medium", column.className)}
                            >
                                {column.header}
                            </th>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row, index) => (
                            <TableRow 
                                key={index} 
                                onClick={() => onRowClick?.(row)}
                                className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                            >
                                {columns.map((column) => (
                                    <TableCell key={column.key} className={column.className}>
                                        {column.render(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}