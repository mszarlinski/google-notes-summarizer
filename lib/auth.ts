import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { tokenStore } from "@/lib/token-store";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    userEmail?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl.origin));
      }
      return true;
    },
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        if (token.email && account.refresh_token) {
          tokenStore.set(token.email, account.refresh_token);
        }
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      session.userEmail = token.email ?? undefined;
      return session;
    },
  },
});
