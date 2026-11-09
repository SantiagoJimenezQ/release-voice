import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({ src: "./fonts/geist.woff2", variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Release Voice",
  description: "Product updates, in your voice. Turn releases into LinkedIn and X drafts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={geist.variable}><body>{children}</body></html>;
}
