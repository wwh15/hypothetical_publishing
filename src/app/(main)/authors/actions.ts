"use server";

import { asyncAddAuthor } from "@/lib/data/author";
import { Prisma } from "@prisma/client";

export async function addAuthor(data: Prisma.AuthorUncheckedCreateInput) {
    return await asyncAddAuthor(data);
}