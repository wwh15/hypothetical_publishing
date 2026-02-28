"use server";

import { asyncAddAuthor, asyncDeleteAuthor, asyncGetAllAuthors, asyncGetAuthorBooks, asyncGetAuthorById, asyncGetAuthorsData, asyncUpdateAuthor, DeleteAuthorResponse, GetAuthorBooksResponse, GetAuthorByIdResponse, GetAuthorDataParams, GetAuthorsDataResult, NewAuthorInput, UpdateAuthorRequest, UpdateAuthorResponse } from "@/lib/data/author";
import { Author, Prisma } from "@prisma/client";

export async function addAuthor(data: NewAuthorInput) {
    return await asyncAddAuthor(data);
}

export async function getAuthorById(id: number): Promise<GetAuthorByIdResponse> {
    return await asyncGetAuthorById(id)
}

export async function getAuthorsData(data: GetAuthorDataParams): Promise<GetAuthorsDataResult> {
    return await asyncGetAuthorsData(data);
}

export async function getAllAuthors(): Promise<Author[]> {
    return await asyncGetAllAuthors();
}

export async function getAuthorBooks(id: number): Promise<GetAuthorBooksResponse> {
    return await asyncGetAuthorBooks(id);
}

export async function updateAuthor(data: UpdateAuthorRequest): Promise<UpdateAuthorResponse> {
    const { authorId, name, email } = data;
    return await asyncUpdateAuthor({ authorId, name, email })
}

export async function deleteAuthor(id: number): Promise<DeleteAuthorResponse> {
    return await asyncDeleteAuthor(id);
}