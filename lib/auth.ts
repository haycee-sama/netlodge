// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users, students, landlords } from './db/schema'
import { sendEmail, welcomeEmailHtml } from './email/sendEmail'

async function resolveRoleRecordId(dbUser: typeof users.$inferSelect): Promise<string | null> {
  if (dbUser.role === 'student') {
    const [s] = await db.select({ id: students.id }).from(students).where(eq(students.userId, dbUser.id)).limit(1)
    return s?.id ?? null
  }
  if (dbUser.role === 'landlord') {
    const [l] = await db.select({ id: landlords.id }).from(landlords).where(eq(landlords.userId, dbUser.id)).limit(1)
    return l?.id ?? null
  }
  return null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('1. Starting authorize...');
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Failed: Missing email or password');
            return null;
          }

          const email = String(credentials.email).toLowerCase().trim();
          const password = String(credentials.password);
          console.log('2. Looking up user:', email);

          const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          
          if (!user) {
            console.log('❌ Failed: User not found in database');
            return null;
          }
          
          if (!user.passwordHash) {
            console.log('❌ Failed: User exists but has no password (OAuth account)');
            return null;
          }

          console.log('3. User found. Comparing passwords...');
          const passwordMatches = await bcrypt.compare(password, user.passwordHash);
          
          if (!passwordMatches) {
            console.log('❌ Failed: Password does not match hash');
            return null;
          }

          console.log('4. Password matched! Resolving role...');
          const roleRecordId = await resolveRoleRecordId(user);

          console.log('✅ Login successful for:', email);
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            roleRecordId: roleRecordId,
          };
        } catch (error) {
          console.error('❌ AUTHORIZE CRASHED:', error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      if (!user.email) return false

      const email = user.email.toLowerCase().trim()
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      if (!existing) {
        const nameParts = (user.name ?? '').trim().split(' ')
        const firstName = nameParts[0] || 'Student'
        const lastName = nameParts.slice(1).join(' ') || ''

        await db.insert(users).values({
          email,
          phone: '',
          passwordHash: null,
          oauthProvider: 'google',
          role: 'student',
          firstName,
          lastName,
          isEmailVerified: true,
        })

        // Fire-and-forget — a slow/failed email send should never block sign-in.
        sendEmail({
          to: email,
          subject: 'Welcome to Netlodge! 🎉',
          html: welcomeEmailHtml(firstName),
        }).catch((err) => console.error('welcome email failed', err))
      }

      return true
    },

    async jwt({ token, user, trigger }) {
      if (user?.email) {
        const email = user.email.toLowerCase().trim()
        const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
          token.isEmailVerified = dbUser.isEmailVerified
          token.roleRecordId = await resolveRoleRecordId(dbUser)
        }
      } else if (trigger === 'update' && token.id) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, token.id as string)).limit(1)
        if (dbUser) {
          token.role = dbUser.role
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
          token.isEmailVerified = dbUser.isEmailVerified
          token.roleRecordId = await resolveRoleRecordId(dbUser)
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? ''
        session.user.role = (token.role as 'student' | 'landlord' | 'admin') ?? 'student'
        session.user.firstName = (token.firstName as string) ?? ''
        session.user.lastName = (token.lastName as string) ?? ''
        session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false
        session.user.roleRecordId = (token.roleRecordId as string | null) ?? null
      }
      return session
    },
  },
})