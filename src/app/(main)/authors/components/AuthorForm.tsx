"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

// Shadcn UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Import validation and actions
import { validateName, validateEmail } from "@/lib/validation";
import { addAuthor, updateAuthor } from "../actions"; // Added updateAuthor

interface AuthorFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: number;
    name: string;
    email: string;
  };
}

export default function AuthorForm({ mode, initialData }: AuthorFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if initialData changes (e.g., after a server-side fetch)
  useEffect(() => {
    if (initialData) {
      setFormData({ name: initialData.name, email: initialData.email });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nameCheck = validateName(formData.name);
    const emailCheck = validateEmail(formData.email);

    if (!nameCheck.success || !emailCheck.success) {
      const newErrors: Record<string, string> = {};
      if (!nameCheck.success) newErrors.name = nameCheck.error;
      if (!emailCheck.success) newErrors.email = emailCheck.error;
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (mode === "create") {
        result = await addAuthor({
          name: nameCheck.data,
          email: emailCheck.data,
        });
      } else {
        // Edit Mode
        if (!initialData?.id)
          throw new Error("Author ID missing for edit mode");

        result = await updateAuthor({
          authorId: initialData.id,
          name: nameCheck.data,
          email: emailCheck.data,
        });
      }

      if (!result.success) {
        const newErrors: Record<string, string> = {};
        const errorMessage = result.error ?? "A system error occurred.";

        if (errorMessage.toLowerCase().includes("email")) {
          newErrors.email = errorMessage;
        } else {
          newErrors.global = errorMessage;
        }

        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      mode === "create" || !initialData
        ? router.push("/authors")
        : router.push(`/authors/${initialData.id}`);
    } catch (err) {
      setErrors({ global: "An unexpected network error occurred." });
      setIsSubmitting(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
    >
      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {errors.global ||
            "Please correct the errors below before submitting."}
        </div>
      )}

      {/* Info Section */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-1 text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4" />
          <h3 className="text-sm font-semibold">
            {isEdit ? "Update Author" : "Author Information"}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Update the details for this author. Changes will reflect across all associated books."
            : "Enter the details for the new author to link them to books and royalties."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name" className="font-semibold text-sm">
            Full Name
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={cn(errors.name && "border-red-500")}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="email" className="font-semibold text-sm">
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={cn(errors.email && "border-red-500")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Author"
          )}
        </Button>
      </div>
    </form>
  );
}
