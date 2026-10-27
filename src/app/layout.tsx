import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/index.css";
import { SiteShell } from "@/components/SiteShell";

const SITE_URL = "https://truthcap.vercel.app";
const TITLE = "TruthCap — What you agreed, written down. Both keep a copy.";
const DESCRIPTION = "TruthCap turns everyday agreements into shared, timestamped records both people acknowledge. Between a chat screenshot and a formal contract. No account needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TruthCap",
  title: {
    default: TITLE,
    template: "%s · TruthCap",
  },
  description: DESCRIPTION,
  keywords: ["agreement", "record", "contract alternative", "shared agreement", "timestamped record", "mutual agreement", "handover", "receipt", "agreement tracker"],
  authors: [{ name: "TruthCap" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TruthCap",
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TruthCap — what you agreed, written down. Both keep a copy." }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#07100a" },
  ],
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TruthCap",
  description: "Turn everyday agreements into shared, timestamped records both people acknowledge.",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: ["Template-based agreement creation", "Mutual acknowledgment with timestamps", "Share by link or code", "Local-first storage", "Print and PDF export"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      </body>
    </html>
  );
}
