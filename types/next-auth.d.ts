// types/next-auth.d.ts
// Ambient type augmentation only — no runtime code belongs in this file.
// Kept separate from lib/auth.ts so Turbopack never has to bundle a
// `declare module` block into the JS output for any of the three
// contexts lib/auth.ts is imported into (API route, proxy, Server Components).

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: 'student' | 'landlord' | 'admin'
    firstName: string
    lastName: string
    isEmailVerified: boolean
    roleRecordId: string | null
  }

  interface Session {
    user: {
      id: string
      role: 'student' | 'landlord' | 'admin'
      firstName: string
      lastName: string
      isEmailVerified: boolean
      roleRecordId: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'student' | 'landlord' | 'admin'
    firstName: string
    lastName: string
    isEmailVerified: boolean
    roleRecordId: string | null
  }
}