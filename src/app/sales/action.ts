// 'use server'; Uncomment once we actually read from database

import getSalesData from "../../lib/data/sales";

export function getSalesRecordData() {
  return getSalesData();
}
