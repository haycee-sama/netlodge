// app/(auth)/signup/student/page.jsx
// Server Component: fetches the real, DB-backed university list before
// rendering the interactive form, so the dropdown can never drift out
// of sync with what's actually seeded.

import { getUniversitiesForSignup } from '../../../../lib/db/queries'
import StudentSignUpForm from './StudentSignUpForm'

export default async function StudentSignUpPage() {
  const universities = await getUniversitiesForSignup()
  return <StudentSignUpForm universities={universities} />
}