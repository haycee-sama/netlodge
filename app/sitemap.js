// app/sitemap.js
import { getPropertySummaries, getPropertyById } from '../lib/db/queries'

export default async function sitemap() {
  const baseUrl = 'https://netlodge.ng'

  const staticRoutes = ['', '/about', '/faq', '/search', '/contact'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const summaries = await getPropertySummaries()

  const propertyRoutes = summaries.map((p) => ({
    url: `${baseUrl}/property/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // Fetch each property's full room list to build room-level sitemap
  // entries. For very large catalogs, replace this with a single
  // dedicated batched query (e.g. getAllRoomIdsForSitemap()) in
  // lib/db/queries.ts instead of N calls to getPropertyById.
  const fullProperties = await Promise.all(summaries.map((p) => getPropertyById(p.id)))

  const roomRoutes = fullProperties.flatMap((property) =>
    property
      ? property.blocks.flatMap((block) =>
          block.rooms.map((room) => ({
            url: `${baseUrl}/rooms/${room.id}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
          }))
        )
      : []
  )

  return [...staticRoutes, ...propertyRoutes, ...roomRoutes]
}