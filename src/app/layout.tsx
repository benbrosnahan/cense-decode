import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

// Two faces, shared with Loan Desk so the Cense tools read as one family.
// Bricolage carries headlines. Instrument Sans carries everything that gets
// read, which in Decode is nearly everything.
const display = Bricolage_Grotesque({
  variable: "--font-cense-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Instrument_Sans({
  variable: "--font-cense-body",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://cense-decode.vercel.app";
const DESCRIPTION =
  "Paste or screenshot anything money-related that confuses or stresses you. Get a calm, plain-language explanation, whether you should worry, and one next step.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Decode by Cense",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Decode by Cense",
    description:
      "Paste or screenshot anything money-related that confuses you. Get a calm, plain-language explanation and one next step.",
    url: SITE,
    siteName: "Cense",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Decode by Cense" },
};

// What the tool is, for search engines and AI assistants that read the HTML.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Decode by Cense",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "Cense", url: "https://cense.beehiiv.com" },
};

export const viewport: Viewport = {
  themeColor: "#FFFCEC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Nav />
        {children}
      </body>
    </html>
  );
}
