# Testing & Secrets Guide

## Environment Variables

### Public (safe for browser)
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # Supabase publishable/anon key
NEXT_PUBLIC_SITE_URL              # Public site URL for metadata
```

### Server-only (NEVER expose to browser)
```
SUPABASE_SECRET_KEY              # Service-role key — bypasses RLS
SUPABASE_DB_PASSWORD             # Database password for migrations
PAYSTACK_SECRET_KEY              # Paystack API secret
PAYSTACK_WEBHOOK_SECRET          # Paystack webhook signing secret
CLOUDINARY_API_KEY               # Cloudinary API key
CLOUDINARY_API_SECRET            # Cloudinary API secret
```

### Rules
1. Never commit `.env` files — they are gitignored.
2. `.env.example` contains placeholders only — no real values.
3. Server-only variables must NOT have `NEXT_PUBLIC_` prefix.
4. The admin Supabase client (`src/lib/supabase/admin.ts`) uses `SUPABASE_SECRET_KEY` and must never be imported in client components.

## Test Account Setup

### Creating test users
1. Register via the `/register` page or Supabase Dashboard → Authentication → Users → Add user.
2. New registrations automatically get the `student` role (via the `handle_new_user` trigger).
3. To assign admin roles, use the Supabase Dashboard SQL Editor:
   ```sql
   INSERT INTO public.user_roles (user_id, role, reason)
   VALUES ('<user-uuid>', 'verification_officer', 'Test setup');
   ```

### Demo accounts (no real auth)
The login page has quick-access demo buttons for UI testing. These create a local session only — they do NOT authenticate against Supabase. Demo accounts are clearly labelled.

## Safe Test Execution

### Database tests
- Use the Supabase session-mode pooler for direct connections.
- Never run destructive tests against production data.
- Use transactions with ROLLBACK for test operations.

### RLS tests
- RLS must be tested with authenticated user sessions, NOT with the service-role key.
- The service-role key bypasses RLS entirely.
- Test both allowed and denied operations for each role.

### Payment tests
- Use Paystack test mode only (`pk_test_` / `sk_test_` keys).
- Never use live payment credentials for testing.
- Test transactions should be clearly labelled.

## Credential Cleanup Procedure

When development is complete and temporary credentials are no longer needed:

### 1. Supabase
- [ ] Rotate the `SUPABASE_SECRET_KEY` (Supabase Dashboard → Settings → API Keys → Rotate)
- [ ] Change the database password (Supabase Dashboard → Database → Database password)
- [ ] Delete test users from Authentication → Users
- [ ] Remove test rows from `user_roles`, `profiles`, and other tables

### 2. Paystack
- [ ] Revoke test API keys if dedicated test keys were created
- [ ] Delete test transactions from the Paystack dashboard

### 3. Cloudinary
- [ ] Rotate API secret if test uploads were made
- [ ] Delete test uploaded assets

### 4. Local environment
- [ ] Delete `.env` file or replace with production values
- [ ] Clear browser localStorage (`netlodge:auth:dev`, `netlodge-theme`)
- [ ] Clear browser cookies for the development domain

### 5. CI/CD
- [ ] Remove any CI secrets added specifically for this project
- [ ] Revoke any deploy keys or access tokens

### 6. GitHub
- [ ] Review git history for any accidentally committed secrets
- [ ] Rotate any GitHub tokens that may have been exposed
- [ ] Remove any GitHub Actions secrets that are no longer needed
