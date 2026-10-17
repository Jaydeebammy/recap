import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const dmSans = localFont({
  src: "./fonts/DMSans-Variable.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
});

export const metadata: Metadata = {
  title: "Recap — notes engine",
  description: "Turn a meeting recording or transcript into a summary, decisions and action items.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
