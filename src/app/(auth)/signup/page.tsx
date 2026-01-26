"use client";

import { useState } from "react";
import { signUp } from "@/lib/supabase/auth";
import Link from "next/link";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await signUp(formData);

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
        {success ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Check your email</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;ve sent you a confirmation email. Please click the link in the email to verify your account.
            </p>
            <Link
              href="/login"
              className="text-blue-600 hover:underline"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>

            {error && (
              <p className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
                {error}
              </p>
            )}

            <form action={handleSubmit}>
              <div className="mb-4">
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

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
