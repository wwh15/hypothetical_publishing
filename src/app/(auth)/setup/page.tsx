"use client";

import { useState } from "react";
import { setupAdminUser} from "@/lib/supabase/auth";
import Link from "next/link";
import { useRouter }  from "next/navigation";


export default function SetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter(); // initialize router

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

    const result = await setupAdminUser(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    } else if (result?.success) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }

    setLoading(false);
  }

 return (
      <div className="min-h-screen flex items-center justify-center
  bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-8
  w-full max-w-md">
          {success ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Setup
  Complete!</h1> 
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your admin account has been created successfully.
  Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2
  text-center">Initial Setup</h1> 
              <p className="text-sm text-gray-600 dark:text-gray-400
  mb-6 text-center"> 
                Create the admin account for Hypothetical Publishing
              </p>

              {error && (
                <p className="mb-4 p-3 bg-red-100 text-red-800
  rounded-md text-sm">
                  {error}
                </p>
              )}

              <form action={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm
  font-medium mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="admin@example.com" 
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm
  font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Minimum 8 characters" 
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block
  text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white
  rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? "Creating admin account..." : "Complete Setup"} 
                </button>
              </form>

              {/* REMOVED: "Already have an account?" link */}
            </>
          )}
        </div>
      </div>
    );
  }
