"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

// Shadcn UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Import your manual validation helpers
import { validateName, validateEmail } from "@/lib/validation";
import { addAuthor } from "../actions";

export default function AuthorForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({ name: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({}); // Maps field to the error if present
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field as the user types
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
    setErrors({}); // Reset errors before validation

    // Validate name and email
    const nameCheck = validateName(formData.name);
    const emailCheck = validateEmail(formData.email);

    // Check for an errors from input validation
    if (!nameCheck.success || !emailCheck.success) {
      const newErrors: Record<string, string> = {};
      if (!nameCheck.success) {
        newErrors.name = nameCheck.error;
        console.log(`Name error found: ${nameCheck.error}`);
      }
      if (!emailCheck.success) {
        newErrors.email = emailCheck.error;
        console.log(`Email error found: ${emailCheck.error}`);
      }

      setErrors(newErrors);
      return; // Stop the submission
    }

    setIsSubmitting(true);

    // Try to submit valid data
    try {
      const result = await addAuthor({
        name: nameCheck.data,
        email: emailCheck.data,
      });

      // Check for errors from async request to add author to database 
      if (!result.success) {
        const newErrors: Record<string, string> = {};

        if (result.error && result.error.toLowerCase().includes("email")) {
          newErrors.email = result.error;
        } else {
          newErrors.global = result.error || "A system error occurred. Please try again.";
        }

        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      // Data succesfully submitted
      router.push("/authors");
    } catch {
      setErrors({ global: "An unexpected network error occurred." });
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
    >
      {/* Validation Summary Notification */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          Please correct the errors below before submitting.
        </div>
      )}

      {/* Info Section */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-1 text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Author Information</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the details for the new author. This information will be used to
          link authors to books and calculate royalty distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Input Group */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name" className="font-semibold">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Stephen King"
            value={formData.name}
            onChange={handleChange}
            className={cn(
              "h-10 dark:bg-gray-700",
              errors.name && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.name && (
            <p className="text-sm text-red-500 font-medium">{errors.name}</p>
          )}
        </div>

        {/* Email Input Group */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="email" className="font-semibold">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="author@example.com"
            value={formData.email}
            onChange={handleChange}
            className={cn(
              "h-10 dark:bg-gray-700",
              errors.email && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.email && (
            <p className="text-sm text-red-500 font-medium">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-10 px-6 border-gray-300 dark:border-gray-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white transition-colors",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Author"
          )}
        </Button>
      </div>
    </form>
  );
}
