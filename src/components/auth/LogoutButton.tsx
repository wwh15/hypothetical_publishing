"use client";

import { signOut } from "@/lib/supabase/auth";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
    >
      Log out
    </button>
  );
}
