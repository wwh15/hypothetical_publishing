// 'use server'; Uncomment once we actually read from database

import awaitAuthorPaymentData from "@/lib/data/author-payment";
import awaitSalesData from "@/lib/data/records";

export function getSalesRecordData() {
  return awaitSalesData();
}

export function getAuthorPaymentData() {
    return awaitAuthorPaymentData();
}
