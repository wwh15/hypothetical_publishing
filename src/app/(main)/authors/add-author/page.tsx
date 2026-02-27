import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import AuthorForm from "../components/AuthorForm";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AddAuthorPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="mb-8 space-y-6">
        {/* Navigation Section */}
        <div className="flex flex-col gap-3">
          <BackLink href="/authors">Back to Authors</BackLink>
        </div>

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Add New Author
          </h1>
          <p className="text-muted-foreground mt-2">
            Register a new author to the database for book assignments and
            royalty tracking.
          </p>
        </div>
      </div>

      {/* Author Form Section */}
      <div className="max-w-4xl">
        <AuthorForm mode="create" />
      </div>
    </div>
  );
}
