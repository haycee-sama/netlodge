import { PROPERTIES } from './lib/data'

export default function sitemap() {
  const baseUrl = 'https://netlodge.ng'

  const staticRoutes = ['', '/about', '/faq', '/search', '/contact'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const propertyRoutes = PROPERTIES.map((p) => ({
    url: `${baseUrl}/property/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  const roomRoutes = PROPERTIES.flatMap((p) =>
    p.blocks.flatMap((b) =>
      b.rooms.map((r) => ({
        url: `${baseUrl}/rooms/${r.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      }))
    )
  )

  return [...staticRoutes, ...propertyRoutes, ...roomRoutes]
}
