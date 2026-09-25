import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}
