// app/(public)/search/page.jsx
// Server Component: fetches property summaries, hands sanitized data
// to the interactive client-side filter UI.

import { getPropertySummaries } from '../../../lib/db/queries'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const properties = await getPropertySummaries()
  return <SearchClient properties={properties} />
}