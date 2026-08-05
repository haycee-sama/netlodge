// app/(public)/search/page.jsx
// Server Component: fetches property summaries, hands sanitized data
// to the interactive client-side filter UI.

import { getPropertySummaries } from '../../../lib/db/queries'
import SearchClient from './SearchClient'

export const metadata = {
  title: 'Search Verified Student Rooms',
  description: 'Filter thousands of verified student rooms by city, university, room type, and budget. Every listing is escrow-protected and every landlord manually verified.',
  alternates: { canonical: 'https://netlodge.ng/search' },
}

export default async function SearchPage() {
  const properties = await getPropertySummaries()
  return <SearchClient properties={properties} />
}