import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateWooCustomer } from "@/lib/woo/customers";

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
      // Only run on initial sign-in
      if (account?.provider === "google" && !token.wooCustomerId) {
        const email =
          (profile as any)?.email ||
          token.email; // fallback

        const name =
          (profile as any)?.name ||
          token.name ||
          undefined;

        if (email) {
          try {
            const id = await getOrCreateWooCustomer({ email, name });
            token.wooCustomerId = id;
          } catch (e) {
            // Fail-safe: don’t block login if Woo is down
            console.error("[auth] Woo customer sync failed:", e);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Expose Woo customer id
      (session.user as any).wooCustomerId = (token as any).wooCustomerId ?? null;
      return session;
    },
  },
});