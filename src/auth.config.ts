import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    fullName: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: Role;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    fullName: string;
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.fullName = user.fullName as string;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id as string,
          email: token.email as string,
          fullName: token.fullName as string,
          role: token.role as Role,
        },
      };
    },
  },
};
