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
    /** Applied to body cells (`td`) only — width/layout constraints belong here so headers can fit sort controls. */
    className?: string;
    /** Optional classes for the header cell (`th`) only (e.g. `text-center`). */
    headerClassName?: string;
}

interface BaseDataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    /** Extra row classes (e.g. muted styling for pre-release books on sales list). */
    getRowClassName?: (row: T) => string | undefined;
    className?: string;
}

export function BaseDataTable<T>({
    columns,
    data,
    emptyMessage = 'No records found.',
    onRowClick,
    getRowClassName,
    className,
}: BaseDataTableProps<T>) {
    return (
        <div className={cn("min-w-0", className)}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <th 
                                key={column.key} 
                                className={cn(
                                    "min-w-0 overflow-hidden px-2 py-2 text-left text-sm font-medium align-top",
                                    column.headerClassName
                                )}
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
                                className={cn(
                                    onRowClick && "cursor-pointer hover:bg-muted/50",
                                    getRowClassName?.(row)
                                )}
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