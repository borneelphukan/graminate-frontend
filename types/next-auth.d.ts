import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      email: string;
    } & DefaultSession["user"];
  }

  type User = {
    id: string;
    name: string;
    email: string;
  };
}
