"use client";

import { signOut } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => signOut()}>
      Log out
    </Button>
  );
}
