import React from 'react';
import Link from 'next/link';
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
    /** Native tooltip when `header` is short (e.g. abbreviated column titles). */
    headerTitle?: string;
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
    /**
     * Row navigation via real `<a href>` overlays (native new tab, middle-click, context menu).
     * When set and the function returns a URL, `onRowClick` is not used for that row.
     */
    getRowHref?: (row: T) => string | undefined;
    /** Accessible name for the primary row link (first column); defaults to "View row". */
    getRowLinkLabel?: (row: T) => string;
    onRowClick?: (row: T) => void;
    /** Extra row classes (e.g. muted styling for pre-release books on sales list). */
    getRowClassName?: (row: T) => string | undefined;
    className?: string;
}

const CELL_POINTER_RESTORE =
    '[&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_select]:pointer-events-auto [&_textarea]:pointer-events-auto [&_label]:pointer-events-auto';

export function BaseDataTable<T>({
    columns,
    data,
    emptyMessage = 'No records found.',
    getRowHref,
    getRowLinkLabel,
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
                                title={column.headerTitle}
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
                        data.map((row, index) => {
                            const rowHref = getRowHref?.(row);
                            const rowIsLink = Boolean(rowHref?.length);
                            return (
                            <TableRow 
                                key={index} 
                                onClick={
                                    rowIsLink
                                        ? undefined
                                        : () => onRowClick?.(row)
                                }
                                className={cn(
                                    (rowIsLink || onRowClick) &&
                                        "cursor-pointer hover:bg-muted/50",
                                    getRowClassName?.(row)
                                )}
                            >
                                {columns.map((column, colIndex) => (
                                    <TableCell
                                        key={column.key}
                                        className={cn(
                                            "relative",
                                            column.className
                                        )}
                                    >
                                        {rowIsLink && rowHref && (
                                            <Link
                                                href={rowHref}
                                                prefetch={false}
                                                aria-hidden={
                                                    colIndex > 0
                                                        ? true
                                                        : undefined
                                                }
                                                aria-label={
                                                    colIndex === 0
                                                        ? getRowLinkLabel?.(row) ??
                                                          "View row"
                                                        : undefined
                                                }
                                                tabIndex={
                                                    colIndex === 0 ? 0 : -1
                                                }
                                                data-row-link=""
                                                className={cn(
                                                    "absolute inset-0 z-[1] rounded-sm",
                                                    "outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                                                )}
                                            />
                                        )}
                                        <div
                                            className={cn(
                                                "relative z-[2]",
                                                rowIsLink &&
                                                    `pointer-events-none ${CELL_POINTER_RESTORE}`
                                            )}
                                        >
                                            {column.render(row)}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}