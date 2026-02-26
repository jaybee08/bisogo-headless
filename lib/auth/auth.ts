// lib/auth/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateWooCustomerId } from "@/lib/woo/customer"; // ✅ matches your file/export

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, profile }) {
      // We'll attach Woo customer id to the JWT.
      // 1) Try on initial Google sign-in (account exists)
      // 2) If it's still missing later (e.g. Woo was down), retry quietly.
      const needsWoo = !(token as any).wooCustomerId;

      const email =
        (profile as any)?.email ||
        (token.email as string | undefined) ||
        "";

      const name =
        (profile as any)?.name ||
        (token.name as string | undefined) ||
        null;

      const isInitialGoogleSignIn = account?.provider === "google";

      if (needsWoo && email && (isInitialGoogleSignIn || !!token.email)) {
        try {
          const id = await getOrCreateWooCustomerId({ email, name });
          (token as any).wooCustomerId = id;
        } catch (e) {
          // Fail-safe: don't block login if Woo is down
          console.error("[auth] Woo customer sync failed:", e);
        }
      }

      return token;
    },

    async session({ session, token }) {
      (session.user as any).wooCustomerId = (token as any).wooCustomerId ?? null;
      return session;
    },
  },
});