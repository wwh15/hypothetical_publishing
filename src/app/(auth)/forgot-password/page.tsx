"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/supabase/auth";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await requestPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(true);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>

        {error && (
          <p className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {error}
          </p>
        )}

        {success ? (
          <div>
            <p className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-sm">
              Check your email for a reset link.
            </p>
            <Link
              href="/login"
              className="block text-center text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form action={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 mb-4"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
