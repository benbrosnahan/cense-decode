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

export const metadata: Metadata = {
  title: "Decode by Cense",
  description:
    "Paste or screenshot anything money-related that confuses or stresses you. Get a calm, plain-language explanation, whether you should worry, and one next step.",
  openGraph: {
    title: "Decode by Cense",
    description:
      "Paste or screenshot anything money-related that confuses you. Get a calm, plain-language explanation and one next step.",
    url: "https://cense-decode.vercel.app",
    siteName: "Cense",
    type: "website",
  },
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
        <Nav />
        {children}
      </body>
    </html>
  );
}
