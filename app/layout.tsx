import type React from "react"
import type { Metadata } from "next"

// import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/lib/providers"
import "./globals.css"

import { Inter, JetBrains_Mono, Space_Grotesk as V0_Font_Space_Grotesk, Space_Mono as V0_Font_Space_Mono } from 'next/font/google'
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

// Initialize fonts
const _spaceGrotesk = V0_Font_Space_Grotesk({ subsets: ['latin'], weight: ["300","400","500","600","700"] })
const _spaceMono = V0_Font_Space_Mono({ subsets: ['latin'], weight: ["400","700"] })

const _inter = Inter({ subsets: ["latin"] })
const _jetbrains = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sanca - Transparent Savings & Credit",
  description: "Join trusted circles for transparent rotating savings and credit. Manage funds with your community.",
  icons: {
    icon: "/favicon.ico"
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-mono antialiased`}>
        <Providers>
          <ThemeProvider>
            <Navbar />
            {children}
            <Footer />
          </ThemeProvider>
        </Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
