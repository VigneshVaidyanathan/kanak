import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Hashing is Convex Auth's default (Scrypt). Pre-existing bcrypt hashes
      // cannot be verified by it, so migrations.ts resets them onto the same
      // account rather than leaving people with a password that silently fails.
      // `profile` runs on every flow, and its `email` is what sign-in looks the
      // account up by, so normalizing here keeps sign-up and sign-in agreeing.
      profile: (params) => {
        const email = (params.email as string).trim().toLowerCase();
        return {
          email,
          name: (params.name as string) ?? email,
          // Role is never taken from sign-up params — that would let anyone
          // register as an admin. Promotion happens out of band.
          role: 'user',
        };
      },
    }),
  ],
});
