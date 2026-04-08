import type { Metadata } from 'next'
import { Big_Shoulders, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'


const bigShoulders = Big_Shoulders({ 
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-big-shoulders"
});

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: 'Mirova - AI Image Authenticity Detection',
  description: 'Detect AI-generated images in seconds with Mirova.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${inter.variable}`}>
      <body className="font-inter antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
