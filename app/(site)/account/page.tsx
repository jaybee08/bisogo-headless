import { auth, signIn, signOut } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { SignOutButton } from "@/components/account/signout-button";


export const revalidate = 0;
const fbEnabled = false; // toggle later when Meta app is ready


function GoogleGWhiteIcon(props: React.SVGProps<SVGSVGElement>) {
  // Simple "G" mark (white) so it works on colored buttons
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 3.25c-4.83 0-8.75 3.92-8.75 8.75S7.17 20.75 12 20.75c4.33 0 7.97-3.16 8.63-7.31.08-.52.12-1.07.12-1.69 0-.41-.03-.82-.09-1.25H12v3h5.45c-.63 2.56-2.82 4.25-5.45 4.25-3.17 0-5.75-2.58-5.75-5.75S8.83 6.25 12 6.25c1.41 0 2.67.51 3.65 1.35l2.05-2.05C16.2 4.14 14.2 3.25 12 3.25Z"
      />
    </svg>
  );
}

export default async function AccountPage() {
  const session = await auth();

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Sign in to attach customer details to your WooCommerce order.
        </p>

        {session?.user ? (
          <div className="mt-6 space-y-3">
            <div className="text-sm">
              <div className="text-[color:var(--color-muted-foreground)]">Signed in as</div>
              <div className="mt-1 font-medium">{session.user.name ?? session.user.email}</div>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
            <SignOutButton />
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {/* GOOGLE (orange button, white G icon) */}
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/account" });
              }}
            >
              <Button
                type="submit"
                className="w-full h-11 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center gap-2"
              >
                <GoogleGWhiteIcon className="h-5 w-5 text-white" />
                Continue with Google
              </Button>
            </form>

            {/* FACEBOOK (blue button, white icon) */}
            <form
              action={async () => {
                "use server";
                if (!fbEnabled) return; // ✅ no-op while disabled
                await signIn("facebook", { redirectTo: "/account" });
              }}
            >
              <Button
                type="submit"
                disabled={!fbEnabled}
                className="w-full"
                variant="outline"
                aria-disabled={!fbEnabled}
              >
                <Facebook className="mr-2 h-4 w-4" />
                Continue with Facebook
                {!fbEnabled ? (
                  <span className="ml-2 text-xs text-[color:var(--color-muted-foreground)]">(Coming soon)</span>
                ) : null}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}