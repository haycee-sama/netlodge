import './globals.css'

const siteUrl = 'https://netlodge.ng'
const defaultTitle = 'Netlodge — Verified Student Housing in Nigeria'
const defaultDescription = 'Find verified student housing near Nigerian universities. Every landlord verified, every payment escrow-protected.'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: '%s | Netlodge',
  },
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    siteName: 'Netlodge',
    locale: 'en_NG',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Netlodge — Verified Student Housing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 font-body antialiased">
        {children}
      </body>
    </html>
  )
}
