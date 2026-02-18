"use server";

import { asyncAddAuthor, asyncGetAuthorBooks, asyncGetAuthorById, asyncUpdateAuthor, GetAuthorBooksResponse, GetAuthorByIdResponse, UpdateAuthorRequest, UpdateAuthorResponse } from "@/lib/data/author";
import { Prisma } from "@prisma/client";

export async function addAuthor(data: Prisma.AuthorUncheckedCreateInput) {
    return await asyncAddAuthor(data);
}

export async function getAuthorById(id: number): Promise<GetAuthorByIdResponse> {
    return await asyncGetAuthorById(id)
}

export async function getAuthorBooks(id: number): Promise<GetAuthorBooksResponse> {
    return await asyncGetAuthorBooks(id);
}

export async function updateAuthor(data: UpdateAuthorRequest): Promise<UpdateAuthorResponse> {
    const { authorId, name, email } = data;
    return await asyncUpdateAuthor({ authorId, name, email })
}