"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    if (loading) return;
    setLoading(true);

    try {
      // Don't rely on a redirect inside a modal; just sign out and refresh UI
      await signOut({ redirect: false });
      router.refresh(); // forces session re-fetch + rerender
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onSignOut} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing out…
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </>
      )}
    </Button>
  );
}