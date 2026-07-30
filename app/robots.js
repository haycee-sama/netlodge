export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/booking',
          '/saved',
          '/profile',
          '/landlord',
          '/login',
          '/signup',
          '/verify',
        ],
      },
    ],
    sitemap: 'https://netlodge.ng/sitemap.xml',
  }
}