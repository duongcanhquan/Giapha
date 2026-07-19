import type { Metadata } from "next";
import { Be_Vietnam_Pro, Literata } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Giapha — Cây gia phả",
  description: "Cây gia phả tương tác với React Flow, trace route và placeholder khuyết danh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e9eef3] text-[#1c1410]">
        {children}
      </body>
    </html>
  );
}
