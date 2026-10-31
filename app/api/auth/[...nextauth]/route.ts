import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/dbConnection";
import User from "@/models/User";
import { verifyPassword } from "@/lib/authHelper";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isValid = verifyPassword(credentials.password, user.salt, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          companyId: user.companyId ? user.companyId.toString() : undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = (user as any).companyId;
      }
      if (!token.companyId && token.id) {
        try {
          const dbUser = await User.findById(token.id).lean();
          if (dbUser?.companyId) {
            token.companyId = dbUser.companyId.toString();
          }
        } catch (e) {}
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).companyId = token.companyId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
