import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import SteamProvider from "authjs-steam-provider";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    (req) =>
      SteamProvider(req, {
        clientSecret: process.env.STEAM_API_KEY!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
      }),
  ],
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (account?.provider === "steam" && user?.id) {
        const steamId = user.id;
        const dbUser = await prisma.user.upsert({
          where: { steamId },
          update: {
            name: user.name ?? undefined,
            avatarUrl: user.image ?? undefined,
          },
          create: {
            steamId,
            email: user.email ?? `${steamId}@steamcommunity.com`,
            name: user.name,
            avatarUrl: user.image,
            subscription: { create: {} },
          },
        });
        token.id = dbUser.id;
        return token;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
