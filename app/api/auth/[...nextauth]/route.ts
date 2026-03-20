import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import dbConnect from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

const { handlers, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      // Note: This Google provider is strictly for NextAuth dashboard login.
      // The integrations are handled separately in lib/google/oauth.ts
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // 1. On sign in, ensure the user is saved/upserted in our MongoDB User model
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();
        try {
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // New user registration flow
            await User.create({
              email: user.email,
              name: user.name,
              plan: 'free',
              scansUsed: 0,
            });
          } else if (existingUser.name !== user.name && user.name) {
            // Update name if changed
            existingUser.name = user.name;
            await existingUser.save();
          }
          return true;
        } catch (error) {
          console.error("NextAuth signIn error:", error);
          return false;
        }
      }
      return true;
    },

    // 2. Attach MongoDB _id to the JWT token
    async jwt({ token, user, trigger }) {
      if (user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
        }
      }
      return token;
    },

    // 3. Expose the user._id on session.user.id for client-side and API use
    async session({ session, token }) {
      if (session?.user && token?.id) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
});

export const { GET, POST } = handlers;
// For use in server components
export { auth };
