import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { AuthorGroup } from "@/lib/data/author-payment";


export default function AuthorPaymentsTable({authorPaymentData}: {authorPaymentData: AuthorGroup[]}) {

  const paidStyles = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  } as const;

  return (
    <Table>
      <TableBody>
        {authorPaymentData.map((group, groupIndex) => (
          <React.Fragment key={`group-${groupIndex}`}>
            {/* Author Header Row */}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={2} className="font-semibold text-base">
                {group.author}
              </TableCell>
              <TableCell colSpan={2} className="text-right font-semibold">
                Unpaid Total: ${group.unpaidTotal.toFixed(2)}
              </TableCell>
              <TableCell colSpan={2} className="text-right">
                <button className="text-sm font-medium text-blue-600 hover:underline">
                  Mark all as paid
                </button>
              </TableCell>
            </TableRow>

            {/* Column Headers for Sales */}
            <TableRow className="bg-gray-100 dark:bg-gray-800">
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Publisher Revenue</TableHead>
              <TableHead className="text-right">Author Royalty</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>

            {/* Sales Data Rows */}
            {group.sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{sale.title}</TableCell>
                <TableCell className="text-right">{sale.quantity}</TableCell>
                <TableCell className="text-right font-medium">
                  ${sale.publisherRevenue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${sale.authorRoyalty.toFixed(2)}
                </TableCell>
                <TableCell>{sale.date}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paidStyles[sale.paid]}`}
                  >
                    {sale.paid.charAt(0).toUpperCase() + sale.paid.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
