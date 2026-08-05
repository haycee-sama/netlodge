// app/sitemap.js
import { getPropertySummaries, getAllRoomIdsForSitemap } from '../lib/db/queries'

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

  // Single batched query for every room id — replaces the old approach
  // of calling getPropertyById() once per property to read out room ids.
  const roomIds = await getAllRoomIdsForSitemap()

  const roomRoutes = roomIds.map((id) => ({
    url: `${baseUrl}/rooms/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticRoutes, ...propertyRoutes, ...roomRoutes]
}