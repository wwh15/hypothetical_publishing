// lib/data/records.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export interface SaleListItem {
  id: number;
  title: string;
  author: string;
  date: string;
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  paid: "paid" | "pending";
}

export interface PendingSaleItem {
  // No id - these aren't saved yet
  bookId: number;
  title: string;
  author: string[];
  date: string; // MM-YYYY format
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  royaltyOverridden: boolean; // Whether user manually overrode the calculated royalty
  paid: boolean; // Always false for pending, but included for consistency
}

export type SaleDetailPayload = Prisma.SaleGetPayload<{
  include: { book: { include: { authors: true } } };
}>;

export default async function asyncGetSalesData() {
  return await prisma.sale.findMany({
    include: { book: { include: { authors: true } } },
    orderBy: { date: "desc" },
  });
}

export async function asyncGetSaleById(id: number) {
  return await prisma.sale.findUnique({
    where: { id },
    include: { book: { include: { authors: true } } },
  });
}

// mapper used by list/payment screens
export function toSaleListItem(sale: {
  id: number;
  date: string;
  quantity: number;
  publisherRevenue: number;
  authorRoyalty: number;
  paid: boolean;
  book: { title: string; authors: { name: string }[] };
}): SaleListItem {
  return {
    id: sale.id,
    title: sale.book.title,
    author: sale.book.authors.map((a) => a.name).join(", "),
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    paid: sale.paid ? "paid" : "pending",
  };
}

export async function asyncAddSale(data: Prisma.SaleUncheckedCreateInput) {
  return await prisma.sale.create({ data });
}

// write ops moved here
export async function asyncUpdateSale(
  id: number,
  data: {
    bookId?: number;
    date?: string;
    quantity?: number;
    publisherRevenue?: number;
    authorRoyalty?: number;
    royaltyOverridden?: boolean;
    paid?: boolean;
  },
) {
  return await prisma.sale.update({ where: { id }, data });
}

export async function asyncDeleteSale(id: number) {
  return await prisma.sale.delete({ where: { id } });
}

export async function asyncTogglePaidStatus(
  id: number,
  currentStatus: boolean,
) {
  return await prisma.sale.update({
    where: { id },
    data: { paid: !currentStatus },
  });
}
