import { getBooksData } from "@/app/(main)/books/action";
import SalesInputClient from "../components/SalesInputClient";

export const dynamic = "force-dynamic";

export default async function SalesInputPage() {
  const { items: booksData } = await getBooksData({
    search: "",
    page: 1,
    pageSize: 2000,
  });

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Add Sales Records</h1>
        <p className="text-muted-foreground">
          Input sales records and review before submitting to the database.
        </p>
      </div>
      <SalesInputClient booksData={booksData} />
    </div>
  );
}
