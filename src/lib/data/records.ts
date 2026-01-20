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

export type SaleDetailPayload = Prisma.SaleGetPayload<{
  include: { book: { include: { author: true } } };
}>;

export default async function asyncGetSalesData() {
  return await prisma.sale.findMany({
    include: { book: { include: { author: true } } },
    orderBy: { date: "desc" },
  });
}

export async function asyncGetSaleById(id: number) {
  return await prisma.sale.findUnique({
    where: { id },
    include: { book: { include: { author: true } } },
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
  book: { title: string; author: { name: string } };
}): SaleListItem {
  return {
    id: sale.id,
    title: sale.book.title,
    author: sale.book.author.name,
    date: sale.date,
    quantity: sale.quantity,
    publisherRevenue: sale.publisherRevenue,
    authorRoyalty: sale.authorRoyalty,
    paid: sale.paid ? "paid" : "pending",
  };
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
  }
) {
  return await prisma.sale.update({ where: { id }, data });
}

export async function asyncDeleteSale(id: number) {
  return await prisma.sale.delete({ where: { id } });
}

export async function asyncTogglePaidStatus(id: number, currentStatus: boolean) {
  return await prisma.sale.update({
    where: { id },
    data: { paid: !currentStatus },
  });
}
