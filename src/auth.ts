import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { prisma } from "@/lib/db/prisma";
import { authProviders, hasDevCredentialsProvider } from "@/lib/auth/provider-config";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: hasDevCredentialsProvider ? "jwt" : "database",
  },
  providers: authProviders,
  callbacks: {
    session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id ?? token.sub ?? "";
      }

      return session;
    },
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
